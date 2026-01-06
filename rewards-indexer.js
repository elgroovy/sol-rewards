/*
 * Runs on a schedule (default every 30 minutes) to pull outbound transactions
 * from the fee distributor wallet via Helius RPC, parse rewards (SOL + SPL), and update MySQL tables:
 *   - rewards_totals
 *   - rewards_token_totals
 *   - rewards_events
 *   - indexer_cursor
 */

import fetch from "node-fetch";
import { Constants } from './constants.js';
import { Config } from './config.js';
import * as db from "./db.js"
import { PublicKey } from "@solana/web3.js";

// Configurable guard for rent-size SOL movements
const RENT_LAMPORTS_MAX = 5_000_000; // 0.005 SOL default

if (!Config.heliusApiKey) {
  console.error("Missing HELIUS_API_KEY in environment");
  process.exit(1);
}

const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${Config.heliusApiKey}`;
// Helius REST bulk endpoint for enhanced parsed transactions
const HELIUS_REST_URL = `https://api.helius.xyz/v0/transactions?api-key=${Config.heliusApiKey}`;

const INTERVAL_MS = Config.indexerIntervalMin * 60 * 1000;

// USDC main mint (for raw totals in rewards_totals)
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_SENTINEL_MINT = "SOL"; // used in rewards_events.token_mint for native SOL rows
const SOL_DECIMALS = 9;

// Simple sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Cursor helpers ---------------------------------------------
async function getCursor() {
  const [rows] = await db.query(
    `SELECT last_signature, last_slot FROM indexer_cursor WHERE source_wallet = ? LIMIT 1`,
    [Constants.kFeeRecipientWalletPubkey]
  );
  if (rows.length) {
    return {
      lastSignature: rows[0].last_signature || null,
      lastSlot: rows[0].last_slot != null ? Number(rows[0].last_slot) : null,
    };
  }
  return { lastSignature: null, lastSlot: null };
}

async function saveCursor(sig, slot) {
  await db.query(
    `INSERT INTO indexer_cursor (source_wallet, last_signature, last_slot, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE last_signature=VALUES(last_signature),
                             last_slot=VALUES(last_slot),
                             updated_at=NOW()`,
    [Constants.kFeeRecipientWalletPubkey, sig, slot]
  );
}

// --- RPC utilities ----------------------------------------------
async function rpc(method, params) {
  const body = { jsonrpc: "2.0", id: method, method, params };
  const r = await fetch(HELIUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (j.error) throw new Error(`${method} error: ${JSON.stringify(j.error)}`);
  return j.result;
}

async function rpcBatch(calls) {
  const body = calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params }));
  const r = await fetch(HELIUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error("batch error");
  return j;
}

async function fetchSignatures(before, limit = 1000) {
  return rpc("getSignaturesForAddress", [Constants.kFeeRecipientWalletPubkey, { limit, before }]);
}

async function postHeliusBulk(signatures, { signal } = {}) {
  const r = await fetch(HELIUS_REST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: signatures }),
    signal,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Helius bulk error ${r.status}: ${text}`);
  }
  return r.json(); // array of parsed txs
}

export async function fetchTransactionsBatch(signatures, opts = {}) {
  const {
    chunkSize = 100,        // Helius supports ~100 per call
    maxRetries = 3,
    backoffMs = 500,
    signal,
  } = opts;

  const results = [];
  for (let i = 0; i < signatures.length; i += chunkSize) {
    const chunk = signatures.slice(i, i + chunkSize);

    let attempt = 0;
    // simple retry with linear backoff
    while (true) {
      try {
        const arr = await postHeliusBulk(chunk, { signal });
        // Helius returns an array; filter out null/undefined just in case
        for (const tx of arr || []) {
          if (tx) results.push(tx);
        }
        break;
      } catch (err) {
        attempt += 1;
        if (attempt > maxRetries) throw err;
        await sleep(backoffMs * attempt);
      }
    }
  }
  return results;
}

// Cache mint decimals to minimize extra RPC
const mintDecimalsCache = new Map();
mintDecimalsCache.set(SOL_SENTINEL_MINT, SOL_DECIMALS);
mintDecimalsCache.set(USDC_MINT, 6);

async function getMintDecimals(mint) {
  if (!mint) return null;
  if (mintDecimalsCache.has(mint)) return mintDecimalsCache.get(mint);

  // We use getTokenSupply to read decimals (widely supported)
  const res = await rpc("getTokenSupply", [mint]);
  const dec = Number(res?.value?.decimals ?? 0);
  mintDecimalsCache.set(mint, dec);
  return dec;
}

const onCurveCache = new Map();

/* fast on-curve test */
export function isOnCurveAddress(base58) {
  const hit = onCurveCache.get(base58);
  if (hit !== undefined) return hit;
  try {
    const pk = new PublicKey(base58);
    const ok = PublicKey.isOnCurve(pk.toBytes());
    onCurveCache.set(base58, ok);
    return ok;
  } catch {
    onCurveCache.set(base58, false);
    return false;
  }
}

// --- Extraction: build events in RAW units ----------------------
/**
 * Extract rewards from a Helius enhanced transaction
 * (response from /v0/transactions bulk endpoint).
 *
 * Returns an array of event objects:
 *   signature: string,
 *   slot: number,
 *   blockTime: Date,
 *   wallet: string,
 *   assetType: 'SOL' | 'SPL',
 *   tokenMint: string,
 *   amountRaw: string,
 *   decimals: number
 */
export function extractRewards(tx) {
  if (!tx) return [];
  const out = [];

  const signature = tx.signature;
  const slot = tx.slot;
  const blockTime = tx.timestamp ? new Date(tx.timestamp * 1000) : new Date();

  // Do we have any token payouts from distributor in this tx?
  const hasTokenPayout =
    Array.isArray(tx.tokenTransfers) &&
    tx.tokenTransfers.some(
      (tt) => tt.fromUserAccount === Constants.kFeeRecipientWalletPubkey && tt.tokenAmount > 0
    );

  // Quick instruction hint: many “rent” ops come with create/close account types
  const hasCreateOrCloseInstr =
    Array.isArray(tx.instructions) &&
    tx.instructions.some((ix) => {
      const t = (ix?.type || "").toString().toUpperCase();
      return t.includes("CREATE") || t.includes("CLOSE");
    });

  // --- Native SOL transfers (filter rent-sized ones tied to token payouts) ---
  if (Array.isArray(tx.nativeTransfers)) {
    for (const nt of tx.nativeTransfers) {
      if (nt.fromUserAccount !== Constants.kFeeRecipientWalletPubkey) continue;
      if (!nt.toUserAccount || !(nt.amount > 0)) continue;


      // Skip off-curve destinations (e.g. temp accounts / PDAs).
      // This will skip Jupiter Aggregator swap transactions and similar things
      if (!isOnCurveAddress(nt.toUserAccount)) continue;

      // Heuristic to drop ATA rent:
      //  - if this tx also sends a token (payout), and
      //  - the SOL amount is small (≤ RENT_LAMPORTS_MAX), and/or
      //  - the tx shows create/close instructions
      const looksLikeRent =
        (hasTokenPayout && nt.amount <= RENT_LAMPORTS_MAX) ||
        (hasCreateOrCloseInstr && nt.amount <= RENT_LAMPORTS_MAX);

      if (looksLikeRent) continue; // skip rent funding / close-account dust

      out.push({
        signature,
        slot,
        blockTime,
        wallet: nt.toUserAccount,
        assetType: "SOL",
        tokenMint: "SOL", // sentinel for native SOL
        amountRaw: String(nt.amount), // lamports
        decimals: 9,
      });
    }
  }

  // --- SPL token transfers (keep as-is) ---
  if (Array.isArray(tx.tokenTransfers)) {
    for (const tt of tx.tokenTransfers) {
      if (tt.fromUserAccount !== Constants.kFeeRecipientWalletPubkey) continue;
      if (!tt.toUserAccount || !(tt.tokenAmount > 0)) continue;

      // Skip off-curve destinations (e.g. temp accounts / PDAs).
      // This will skip Jupiter Aggregator swap transactions and similar things
      if (!isOnCurveAddress(tt.toUserAccount)) continue;

      out.push({
        signature,
        slot,
        blockTime,
        wallet: tt.toUserAccount,
        assetType: "SPL",
        tokenMint: tt.mint,
        amountRaw: String(tt.tokenAmount),
        decimals: Number.isFinite(tt.decimals) ? tt.decimals : 0,
      });
    }
  }

  return out;
}

// --- Persistence (RAW-only updates) -----------------------------
async function saveRewards(events) {
  if (!events || events.length === 0) return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (const ev of events) {
      // rewards_events: token_mint is NOT NULL (use 'SOL' sentinel), PK(signature, wallet, token_mint)
      await conn.execute(
        `INSERT IGNORE INTO rewards_events
         (signature, slot, block_time, wallet, asset_type, token_mint, amount_raw, decimals)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ev.signature,
          ev.slot,
          ev.blockTime,
          ev.wallet,
          ev.assetType,
          ev.tokenMint,
          ev.amountRaw,
          ev.decimals,
        ]
      );

      // rewards_totals: accumulate SOL/USDC RAW only
      if (ev.assetType === "SOL" && ev.tokenMint === SOL_SENTINEL_MINT) {
        await conn.execute(
          `INSERT INTO rewards_totals (wallet, sol_total_raw, usdc_total_raw, last_updated)
           VALUES (?, ?, 0, NOW())
           ON DUPLICATE KEY UPDATE sol_total_raw = sol_total_raw + VALUES(sol_total_raw),
                                   last_updated = NOW()`,
          [ev.wallet, ev.amountRaw]
        );
      } else if (ev.assetType === "SPL") {
        if (ev.tokenMint === USDC_MINT) {
          await conn.execute(
            `INSERT INTO rewards_totals (wallet, sol_total_raw, usdc_total_raw, last_updated)
             VALUES (?, 0, ?, NOW())
             ON DUPLICATE KEY UPDATE usdc_total_raw = usdc_total_raw + VALUES(usdc_total_raw),
                                     last_updated = NOW()`,
            [ev.wallet, ev.amountRaw]
          );
        }
        // Generic per-token totals (row-per-token)
        await conn.execute(
          `INSERT INTO rewards_token_totals (wallet, token_mint, token_symbol, total_raw, decimals, last_updated)
           VALUES (?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE total_raw = total_raw + VALUES(total_raw),
                                   decimals = VALUES(decimals),   -- keep in sync if discovered
                                   last_updated = NOW()`,
          [ev.wallet, ev.tokenMint, null, ev.amountRaw, ev.decimals]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// --- One indexer cycle ------------------------------------------
async function runOnce() {
  console.log(`[indexer] start ${new Date().toISOString()}`);
  const { lastSignature } = await getCursor();

  let before = undefined;
  let done = false;
  let newestProcessed = null;

  while (!done) {
    const sigs = await fetchSignatures(before, 1000);
    if (sigs.length === 0) break;

    // Process in batches to reduce round-trips
    for (let i = 0; i < sigs.length; i += 100) {
      const batch = sigs.slice(i, i + 100).map((s) => s.signature);
      const txResults = await fetchTransactionsBatch(batch);

      for (const tx of txResults) {
        if (!tx || !tx.signature) continue;

        const sig = tx.signature;
        if (lastSignature && sig === lastSignature) {
          done = true;
          break;
        }

        const rewards = extractRewards(tx);
        if (rewards.length) {
          await saveRewards(rewards);
          if (!newestProcessed) {
            newestProcessed = { sig, slot: tx.slot };
          }
        }
      }
    }

    if (done) break;
    before = sigs[sigs.length - 1].signature; // page older
    await sleep(50); // address rate limiting
  }

  if (newestProcessed) {
    await saveCursor(newestProcessed.sig, newestProcessed.slot);
    console.log(`[indexer] cursor -> ${newestProcessed.sig}`);
  }
  console.log(`[indexer] end   ${new Date().toISOString()}`);
}

// --- Loop (scheduled) -------------------------------------------
async function loop() {
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      console.error("Indexer run error:", e);
    }
    await sleep(INTERVAL_MS);
  }
}

await loop();