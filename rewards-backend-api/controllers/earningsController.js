// earningsController.js
// Totals rewards sent FROM fee distributor TO a user across SOL + SPL (incl. Token-2022)
// API: GET /api/earnings?address=<wallet>&limit=150&before=<signature>

const express = require("express");
const { Connection, PublicKey } = require("@solana/web3.js");
const { Constants } = require("../../constants");

// ------------------- CONFIG -------------------
const INCLUDE_TOKEN2022 = true; // set false if you don't use Token-2022

// Program IDs
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP6GzjT16wyGg1dYVJ3r7wHb7x7S6Q2");

// Pseudo-mint for SOL (wSOL canonical mint id)
const SOL_MINT = "So11111111111111111111111111111111111111112";

// Symbols (extend as needed)
const SYMBOLS = {
  [SOL_MINT]: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  // "<TRT_MINT>": "TRT",
};

// Optional extra SOL sources (comma-separated base58 addresses)
const EXTRA_SOL_SOURCES = (process.env.EXTRA_SOL_SOURCES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// RPC connection
const connection = new Connection(Constants.kHeliusRPCEndpoint, {
  commitment: "confirmed",
  disableRetryOnRateLimit: true,
});

// ------------------- CACHES -------------------
let distributorCache = {
  fetchedAt: 0,
  tokenAccounts: [], // SPL + (optionally) Token-2022 token accounts of the distributor
};
const DISTRIBUTOR_CACHE_TTL_MS = 10 * 60 * 1000;

// ------------------- UTILS -------------------
function createLimiter(max = 6) {
  let active = 0;
  const q = [];
  const run = () => {
    if (active >= max || q.length === 0) return;
    active++;
    const { fn, resolve, reject } = q.shift();
    Promise.resolve()
      .then(fn)
      .then((v) => {
        active--;
        resolve(v);
        run();
      })
      .catch((e) => {
        active--;
        reject(e);
        run();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      q.push({ fn, resolve, reject });
      run();
    });
}
const limitTx = createLimiter(6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------- HELPERS -------------------
async function getDistributorTokenAccounts(distributorPk) {
  const now = Date.now();
  if (now - distributorCache.fetchedAt < DISTRIBUTOR_CACHE_TTL_MS) {
    return distributorCache.tokenAccounts;
  }
  const result = [];

  // SPL token accounts
  {
    const { value } = await connection.getTokenAccountsByOwner(
      distributorPk,
      { programId: TOKEN_PROGRAM_ID },
      "confirmed"
    );
    for (const a of value) result.push(a.pubkey.toBase58());
  }

  // Token-2022 token accounts
  if (INCLUDE_TOKEN2022) {
    try {
      const { value } = await connection.getTokenAccountsByOwner(
        distributorPk,
        { programId: TOKEN_2022_PROGRAM_ID },
        "confirmed"
      );
      for (const a of value) result.push(a.pubkey.toBase58());
    } catch {
      // some RPCs may not support; ignore
    }
  }

  distributorCache = { fetchedAt: now, tokenAccounts: result };
  return result;
}

async function getSigs(addr, limit = 150, before) {
  const opts = { limit };
  if (before) opts.before = before;
  return connection.getSignaturesForAddress(new PublicKey(addr), opts, "confirmed");
}

// Use PARSED tx so System Program transfers are readable
async function fetchTx(signature) {
  return limitTx(async () => {
    for (let i = 0; i < 3; i++) {
      try {
        const tx = await connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });
        return tx || null;
      } catch {
        await sleep(200 * (i + 1));
      }
    }
    return null;
  });
}

// ------------------- CORE ACCUMULATION -------------------
function accumulateFromTx(
  tx,
  distributorPkStr,
  extraSolSources,
  userPkStr,
  totalsByMint
) {
  if (!tx || !tx.meta) return;

  const SYS_PROG_ID = "11111111111111111111111111111111";
  const meta = tx.meta;
  const message = tx.transaction.message;

  // accountKeys as base58 (parsed/unparsed safe)
  const accountKeys = (message.accountKeys || [])
    .map((k) => {
      if (typeof k === "string") return k;
      if (k?.toBase58) return k.toBase58();
      if (k?.pubkey) return typeof k.pubkey === "string" ? k.pubkey : k.pubkey.toBase58?.();
      return null;
    })
    .filter(Boolean);

  // ---------------- SOL (native) — batched-safe ----------------
  // sum all parsed System transfers to this user from allowed sources (top-level + inner)
  const solSourceSet = new Set([distributorPkStr, ...(extraSolSources || [])]);
  let lamportsToUser = 0;

  const scanIx = (ix) => {
    if (!ix) return;
    const isSystem =
      ix.program === "system" ||
      ix.programId === SYS_PROG_ID ||
      (typeof ix.programId === "object" && ix.programId?.toBase58?.() === SYS_PROG_ID);
    if (!isSystem) return;

    const info = ix.parsed?.info;
    if (!info) return;

    const src = info.source;
    const dst = info.destination;
    const l = Number(info.lamports || 0);

    if (l > 0 && dst === userPkStr && solSourceSet.has(src)) {
      lamportsToUser += l; // can accumulate multiple transfers in same tx
    }
  };

  (message.instructions || []).forEach(scanIx);
  (meta.innerInstructions || []).forEach((ii) =>
    (ii.instructions || []).forEach(scanIx)
  );

  // clamp by the user's actual net lamport delta in this tx (pre/post)
  let userLamportDelta = 0;
  const userIndex = accountKeys.indexOf(userPkStr);
  if (userIndex !== -1) {
    const preU = meta.preBalances[userIndex] || 0;
    const postU = meta.postBalances[userIndex] || 0;
    userLamportDelta = Math.max(0, postU - preU);
  }
  const addLamports = Math.min(lamportsToUser, userLamportDelta);
  if (addLamports > 0) {
    totalsByMint[SOL_MINT] = (totalsByMint[SOL_MINT] || 0) + addLamports / 1e9;
  }

  // ---------------- SPL / Token-2022 ----------------
  const preTB = meta.preTokenBalances || [];
  const postTB = meta.postTokenBalances || [];

  const preMap = new Map();
  for (const b of preTB) {
    preMap.set(`${b.accountIndex}|${b.mint}`, Number(b.uiTokenAmount?.uiAmount || 0));
  }
  const postMap = new Map();
  for (const b of postTB) {
    postMap.set(`${b.accountIndex}|${b.mint}`, Number(b.uiTokenAmount?.uiAmount || 0));
  }

  const ownerByIndexMintPre = new Map();
  for (const b of preTB) {
    ownerByIndexMintPre.set(`${b.accountIndex}|${b.mint}`, b.owner);
  }
  const ownerByIndexMintPost = new Map();
  for (const b of postTB) {
    ownerByIndexMintPost.set(`${b.accountIndex}|${b.mint}`, b.owner);
  }

  const seen = new Set([...preMap.keys(), ...postMap.keys()]);
  const mintLoss = {};
  const mintGain = {};

  for (const key of seen) {
    const [idxStr, mint] = key.split("|");
    const idx = Number(idxStr);
    const pre = preMap.get(key) || 0;
    const post = postMap.get(key) || 0;
    const delta = post - pre; // + if increased, - if decreased

    const owner =
      ownerByIndexMintPost.get(key) ||
      ownerByIndexMintPre.get(key) ||
      accountKeys[idx];

    if (owner === distributorPkStr && delta < 0) {
      mintLoss[mint] = (mintLoss[mint] || 0) + Math.abs(delta);
    } else if (owner === userPkStr && delta > 0) {
      mintGain[mint] = (mintGain[mint] || 0) + delta;
    }
  }

  for (const mint of new Set([...Object.keys(mintLoss), ...Object.keys(mintGain)])) {
    const add = Math.min(mintLoss[mint] || 0, mintGain[mint] || 0);
    if (add > 0) {
      totalsByMint[mint] = (totalsByMint[mint] || 0) + add;
    }
  }
}

// ------------------- CONTROLLER -------------------
const getEarningsByWalletAddress = async (req, res) => {
  try {
    const userAddr = String(req.query.address || "").trim();
    if (!userAddr) {
      return res.status(400).json({ error: "Missing ?address" });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit || "150", 10), 10), 500);
    const before = req.query.before ? String(req.query.before) : undefined;

    const distributorPkStr = Constants.kFeeRecipientWalletPubkey;
    const distributorPk = new PublicKey(distributorPkStr);
    // const userPk = new PublicKey(userAddr); // constructed implicitly by logic

    // 1) Distributor token accounts (cached)
    const distributorTokenAccounts = await getDistributorTokenAccounts(distributorPk);

    // 2) Signatures touching distributor SOL, extra SOL senders, and distributor token accounts
    const sigs = [];
    const pushAll = (arr) => arr && arr.forEach((s) => sigs.push(s));

    // Distributor SOL
    pushAll(await getSigs(distributorPkStr, limit, before));

    // Extra SOL sources
    for (const extra of EXTRA_SOL_SOURCES) {
      pushAll(await getSigs(extra, Math.max(50, Math.floor(limit / 2)), before));
    }

    // Token accounts
    for (const ata of distributorTokenAccounts) {
      pushAll(await getSigs(ata, Math.max(50, Math.floor(limit / 2)), before));
    }

    // 3) Dedup + sort newest-first, cap to reasonable page
    const uniq = new Map();
    for (const s of sigs) if (!uniq.has(s.signature)) uniq.set(s.signature, s);
    const signatures = Array.from(uniq.values())
      .sort((a, b) => b.slot - a.slot)
      .slice(0, Math.max(limit, 50));

    if (signatures.length === 0) {
      return res.json({
        address: userAddr,
        items: [],
        scannedTxCount: 0,
        lastSignatureScanned: before || null,
        lastUpdatedISO: new Date().toISOString(),
      });
    }

    // 4) Fetch txs and accumulate
    const totalsByMint = {};
    const lastSig = signatures[signatures.length - 1].signature;

    await Promise.all(
      signatures.map(({ signature }) =>
        fetchTx(signature).then((tx) => {
          if (!tx) return;
          try {
            accumulateFromTx(tx, distributorPkStr, EXTRA_SOL_SOURCES, userAddr, totalsByMint);
          } catch {
            // swallow per-tx errors
          }
        })
      )
    );

    // 5) Shape response
    const items = Object.entries(totalsByMint).map(([mint, amount]) => ({
      mint,
      symbol: SYMBOLS[mint] || null,
      amount,
    }));

    return res.json({
      address: userAddr,
      items,
      scannedTxCount: signatures.length,
      lastSignatureScanned: lastSig,
      lastUpdatedISO: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[earnings] error:", e);
    return res.status(500).json({ error: "Failed to load earnings" });
  }
};

module.exports = { getEarningsByWalletAddress };
