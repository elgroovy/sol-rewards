/*
 * Runs on a schedule (default every 30 minutes) to pull outbound transactions
 * from the fee distributor wallet via Helius RPC, parse rewards (SOL + SPL), and update MySQL tables:
 *   - rewards_totals
 *   - rewards_token_totals
 *   - rewards_events
 *   - indexer_cursor
 */

const fetch = require("node-fetch");
const db = require("./db");

// --- ENV & constants --------------------------------------------
const {
  HELIUS_API_KEY,
  DISTRIBUTOR_WALLET,
  INDEX_INTERVAL_MIN = "30",
} = process.env;

if (!HELIUS_API_KEY || !DISTRIBUTOR_WALLET) {
  console.error("Missing HELIUS_API_KEY or DISTRIBUTOR_WALLET in environment");
  process.exit(1);
}

const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const INTERVAL_MS = Number(INDEX_INTERVAL_MIN) * 60 * 1000;

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
    [DISTRIBUTOR_WALLET]
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
    [DISTRIBUTOR_WALLET, sig, slot]
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
  return rpc("getSignaturesForAddress", [DISTRIBUTOR_WALLET, { limit, before }]);
}

async function fetchTransactionsBatch(sigs) {
  const batch = sigs.map((s) => ({
    method: "getParsedTransaction",
    params: [s, { maxSupportedTransactionVersion: 0 }],
  }));
  return rpcBatch(batch);
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

// --- Extraction: build events in RAW units ----------------------
/**
 * Returns an array of event objects:
 * {
 *   signature, slot, blockTime (Date),
 *   wallet, assetType: 'SOL'|'SPL',
 *   tokenMint: 'SOL' | <mint>,
 *   amountRaw: string (integer string),
 *   decimals: number
 * }
 */
async function extractRewards(tx) {
  if (!tx?.result) return [];
  const result = tx.result;
  const sig = result.transaction.signatures[0];
  const slot = result.slot;
  const blockTime = result.blockTime ? new Date(result.blockTime * 1000) : new Date();

  const out = [];

  // Native SOL transfers: look at parsed system transfers where DISTRIBUTOR_WALLET is source
  for (const ix of result.transaction.message.instructions || []) {
    if (ix.program === "system" && ix.parsed?.type === "transfer") {
      const info = ix.parsed.info;
      if (info?.source === DISTRIBUTOR_WALLET && info?.destination && info?.lamports) {
        // lamports are raw integer units
        const lamports = String(info.lamports); // keep as string to avoid JS precision issues
        out.push({
          signature: sig,
          slot,
          blockTime,
          wallet: info.destination,
          assetType: "SOL",
          tokenMint: SOL_SENTINEL_MINT,
          amountRaw: lamports,
          decimals: SOL_DECIMALS,
        });
      }
    }
  }

  // SPL token transfers: parsed token program transfers where DISTRIBUTOR_WALLET is authority/sourceOwner
  for (const ix of result.transaction.message.instructions || []) {
    if (ix.program === "spl-token" && ix.parsed?.type === "transfer") {
      const info = ix.parsed.info;
      const isFromDistributor =
        info?.sourceOwner === DISTRIBUTOR_WALLET ||
        info?.authority === DISTRIBUTOR_WALLET ||
        info?.owner === DISTRIBUTOR_WALLET; // various parsed shapes

      if (isFromDistributor && info?.mint && (info?.destinationOwner || info?.destination)) {
        // Most parsed payloads put 'amount' as raw integer (string)
        const raw = info.amount != null ? String(info.amount) : null;
        if (!raw) continue;

        const decimals = await getMintDecimals(info.mint);
        out.push({
          signature: sig,
          slot,
          blockTime,
          wallet: info.destinationOwner || info.destination,
          assetType: "SPL",
          tokenMint: info.mint,
          amountRaw: raw,
          decimals: Number.isFinite(decimals) ? decimals : 0,
        });
      }
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
          ev.amountRaw,                   // string OK; mysql2 will coerce
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
    for (let i = 0; i < sigs.length; i += 50) {
      const batch = sigs.slice(i, i + 50).map((s) => s.signature);
      const txResults = await fetchTransactionsBatch(batch);

      for (const tx of txResults) {
        if (!tx?.result) continue;
        const sig = tx.result.transaction.signatures[0];

        // Stop if we reached the last saved cursor (oldest boundary)
        if (lastSignature && sig === lastSignature) {
          done = true;
          break;
        }

        const rewards = await extractRewards(tx);
        if (rewards.length) {
          await saveRewards(rewards);
          if (!newestProcessed) {
            newestProcessed = { sig, slot: tx.result.slot };
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

if (require.main === module) {
  loop();
}
