/**
 * - Serves reward totals & history from MySQL database (no on-demand chain parsing).
 * - Assumes a background indexer maintains:
 *     - rewards_totals         (wallet -> sol_total, usdc_total, last_updated)
 *     - rewards_token_totals   (wallet, token_mint -> total_amount, token_symbol, last_updated)
 *     - rewards_events         (signature, slot, block_time, wallet, asset_type, token_mint, amount)
 *     - indexer_cursor         (source_wallet, last_signature, last_slot, updated_at)
 */

import * as db from '../../db.js';
import { Constants } from '../../constants.js';

const DISTRIBUTOR_WALLET = Constants.kFeeRecipientWalletPubkey;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // used in leaderboard time-window branch

// Helpers
const isNonEmptyString = (s) => typeof s === "string" && s.trim().length > 0;

const asISO = (ts) => {
  // MySQL TIMESTAMP string (UTC) → ISO string
  if (!ts) return null;
  try {
    // If already ISO-like, return it; else construct Date toISOString
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d.toISOString();
    return null;
  } catch {
    return null;
  }
};

/**
 * GET /api/earnings?address=...
 * Returns: { address, items: [{mint?, symbol?, amount}], lastUpdatedISO }
 * - SOL and USDC from rewards_totals
 * - Other tokens from rewards_token_totals
 * - lastUpdated from indexer watermark (indexer_cursor.updated_at) if available,
 *   else the max(last_updated) from totals tables for this wallet.
 */
export async function getEarningsTotals(req, res) {
  try {
    const address = String(req.query.address || "").trim();
    if (!isNonEmptyString(address)) {
      return res.status(400).json({ error: "Missing ?address" });
    }

    // Fetch SOL/USDC totals
    const [totalsRows] = await db.query(
      `SELECT sol_total_raw AS sol_total, usdc_total_raw AS usdc_total, last_updated
       FROM rewards_totals
       WHERE wallet = ?`,
      [address]
    );

    let solTotal = 0;
    let usdcTotal = 0;
    let walletLastUpdated = null;

    if (totalsRows.length > 0) {
      const row = totalsRows[0];
      // raw → UI units
      solTotal = Number(row.sol_total || 0) / 1e9;
      usdcTotal = Number(row.usdc_total || 0) / 1e6;
      walletLastUpdated = asISO(row.last_updated);
    }

    // Fetch other token totals (row-per-token)
    const [tokenRows] = await db.query(
      `SELECT token_mint, token_symbol, total_raw AS total_amount, decimals, last_updated
       FROM rewards_token_totals
       WHERE wallet = ?`,
      [address]
    );

    // Assemble items array for front-end compatibility
    const items = [];

    // Include SOL and USDC first (use symbols)
    if (solTotal && solTotal !== 0) {
      items.push({ symbol: "SOL", amount: solTotal, mint: null });
    }
    if (usdcTotal && usdcTotal !== 0) {
      items.push({ symbol: "USDC", amount: usdcTotal, mint: null });
    }

    // Add other tokens (mint-based)
    for (const r of tokenRows) {
      const amount = Number(r.total_amount || 0) / 10 ** Number(r.decimals || 0);
      if (amount === 0) continue;
      items.push({
        mint: r.token_mint,
        symbol: r.token_symbol || null, // symbol is convenience; may be null
        amount,
      });
    }

    // Determine global lastUpdated watermark (prefer indexer_cursor)
    let lastUpdatedISO = null;

    // Try indexer_cursor for the FEES wallet if present
    const [cursorRows] = await db.query(
      `SELECT updated_at FROM indexer_cursor ${DISTRIBUTOR_WALLET ? "WHERE source_wallet = ?" : ""} LIMIT 1`,
      DISTRIBUTOR_WALLET ? [DISTRIBUTOR_WALLET] : []
    );
    if (cursorRows.length > 0) {
      lastUpdatedISO = asISO(cursorRows[0].updated_at);
    }

    // Fallback to the wallet-specific last_updated if cursor missing
    if (!lastUpdatedISO) {
      // max of wallet totals + token totals for this address
      const [maxRows] = await db.query(
        `SELECT GREATEST(
            IFNULL((SELECT UNIX_TIMESTAMP(MAX(last_updated)) FROM rewards_totals WHERE wallet = ?), 0),
            IFNULL((SELECT UNIX_TIMESTAMP(MAX(last_updated)) FROM rewards_token_totals WHERE wallet = ?), 0)
          ) AS max_unix`,
        [address, address]
      );
      const unix = maxRows?.[0]?.max_unix;
      if (unix && Number(unix) > 0) {
        lastUpdatedISO = new Date(Number(unix) * 1000).toISOString();
      } else {
        lastUpdatedISO = walletLastUpdated || null;
      }
    }

    return res.json({
      address,
      items,
      lastUpdatedISO,
    });
  } catch (err) {
    console.error("getEarningsTotals error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};

/**
 * GET /api/earnings/history?address=...&page=1&pageSize=50
 * Returns: { address, page, pageSize, total, events: [{signature, slot, blockTimeISO, assetType, tokenMint, amount}] }
 * - Paginates rewards_events for the wallet, most-recent first.
 */
export async function getEarningsHistory(req, res) {
  try {
    const address = String(req.query.address || "").trim();
    if (!isNonEmptyString(address)) {
      return res.status(400).json({ error: "Missing ?address" });
    }

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "50", 10), 1), 200);
    const offset = (page - 1) * pageSize;

    // Count total events for pagination
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS c FROM rewards_events WHERE wallet = ?`,
      [address]
    );
    const total = Number(countRows[0]?.c || 0);

    // Fetch page of events
    const sql = `
      SELECT signature, slot, block_time, asset_type, token_mint, amount_raw AS amount, decimals
      FROM rewards_events
      WHERE wallet = ?
      ORDER BY block_time DESC, slot DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const [rows] = await db.query(sql, [address]);

    const events = rows.map((r) => ({
      signature: r.signature,
      slot: Number(r.slot),
      blockTimeISO: asISO(r.block_time),
      assetType: r.asset_type, // 'SOL' | 'SPL'
      tokenMint: r.token_mint || null,
      amount: Number(r.amount || 0) / 10 ** Number(r.decimals || 0),
    }));

    return res.json({
      address,
      page,
      pageSize,
      total,
      events,
    });
  } catch (err) {
    console.error("getEarningsHistory error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

/**
 * GET /api/earnings/leaderboard?asset=SOL|USDC|<mint>&limit=50&from=ISO&to=ISO
 * Returns: { asset, from, to, rows: [{wallet, amount}] }
 * - By default, lifetime totals:
 *   - SOL/USDC from rewards_totals
 *   - Other tokens from rewards_token_totals by token_mint
 * - If from/to provided, computes from rewards_events within the time window.
 */
export async function getLeaderboard(req, res) {
  try {
    const asset = String(req.query.asset || "").trim(); // 'SOL', 'USDC', or token mint
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
    const fromISO = req.query.from ? String(req.query.from) : null;
    const toISO = req.query.to ? String(req.query.to) : null;

    if (!isNonEmptyString(asset)) {
      return res.status(400).json({ error: "Missing ?asset (use SOL, USDC, or a token mint)" });
    }

    // Time-bounded leaderboard → compute from events
    if (fromISO || toISO) {
      const where = ["asset_type = ?"];
      const params = [];

      if (asset.toUpperCase() === "SOL") {
        params.push("SOL");
        where.push("token_mint = 'SOL'");
      } else if (asset.toUpperCase() === "USDC") {
        params.push("SPL");
        // strictly USDC
        where.push("token_mint = ?");
        params.push(USDC_MINT);
      } else {
        // specific token mint
        params.push("SPL");
        where.push("token_mint = ?");
        params.push(asset);
      }

      if (fromISO) {
        where.push("block_time >= ?");
        params.push(new Date(fromISO));
      }
      if (toISO) {
        where.push("block_time < ?");
        params.push(new Date(toISO));
      }

      const sql = `
        SELECT wallet, SUM(amount_raw) AS total_raw, MAX(decimals) AS dec
        FROM rewards_events
        WHERE ${where.join(" AND ")}
        GROUP BY wallet
        ORDER BY total_raw DESC
        LIMIT ?
      `;
      params.push(limit);

      const [rows] = await db.query(sql, params);
      return res.json({
        asset,
        from: fromISO || null,
        to: toISO || null,
        rows: rows.map((r) => ({
          wallet: r.wallet,
          amount: Number(r.total_raw || 0) / 10 ** Number(r.dec || 0),
        })),
      });
    }

    // Lifetime leaderboard → read from totals tables
    if (asset.toUpperCase() === "SOL") {
      const [rows] = await db.query(
        `SELECT wallet, sol_total_raw AS total
         FROM rewards_totals
         WHERE sol_total_raw IS NOT NULL AND sol_total_raw <> 0
         ORDER BY total DESC
         LIMIT ?`,
        [limit]
      );
      return res.json({
        asset: "SOL",
        from: null,
        to: null,
        rows: rows.map((r) => ({ wallet: r.wallet, amount: Number(r.total || 0) / 1e9 })),
      });
    }

    if (asset.toUpperCase() === "USDC") {
      const [rows] = await db.query(
        `SELECT wallet, usdc_total_raw AS total
         FROM rewards_totals
         WHERE usdc_total_raw IS NOT NULL AND usdc_total_raw <> 0
         ORDER BY total DESC
         LIMIT ?`,
        [limit]
      );
      return res.json({
        asset: "USDC",
        from: null,
        to: null,
        rows: rows.map((r) => ({ wallet: r.wallet, amount: Number(r.total || 0) / 1e6 })),
      });
    }

    // Specific token mint lifetime board
    const [rows] = await db.query(
      `SELECT wallet, total_raw AS total, decimals
       FROM rewards_token_totals
       WHERE token_mint = ?
       ORDER BY total DESC
       LIMIT ?`,
      [asset, limit]
    );
    return res.json({
      asset,
      from: null,
      to: null,
      rows: rows.map((r) => ({
        wallet: r.wallet,
        amount: Number(r.total || 0) / 10 ** Number(r.decimals || 0),
      })),
    });
  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

/**
 * GET /api/earnings/status
 * Returns: { sourceWallet, lastSignature, lastSlot, lastUpdatedISO }
 * - Exposes the indexer's watermark for ops/observability.
 */
export async function getIndexerStatus(_req, res) {
  try {
    const [rows] = await db.query(
      `SELECT source_wallet, last_signature, last_slot, updated_at
       FROM indexer_cursor
       ${DISTRIBUTOR_WALLET ? "WHERE source_wallet = ?" : ""}
       ORDER BY updated_at DESC
       LIMIT 1`,
      DISTRIBUTOR_WALLET ? [DISTRIBUTOR_WALLET] : []
    );

    if (rows.length === 0) {
      return res.json({
        sourceWallet: DISTRIBUTOR_WALLET || null,
        lastSignature: null,
        lastSlot: null,
        lastUpdatedISO: null,
      });
    }

    const r = rows[0];
    return res.json({
      sourceWallet: r.source_wallet,
      lastSignature: r.last_signature || null,
      lastSlot: r.last_slot != null ? Number(r.last_slot) : null,
      lastUpdatedISO: asISO(r.updated_at),
    });
  } catch (err) {
    console.error("getIndexerStatus error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
