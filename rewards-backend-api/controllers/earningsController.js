/**
 * - Serves reward totals & history from MySQL database (no on-demand chain parsing).
 * - Assumes a background indexer maintains:
 *     - rewards_totals         (wallet -> sol_total, usdc_total, last_updated)
 *     - rewards_token_totals   (wallet, token_mint -> total_amount, token_symbol, last_updated)
 *     - rewards_events         (signature, slot, block_time, wallet, asset_type, token_mint, amount)
 *     - indexer_cursor         (source_wallet, last_signature, last_slot, updated_at)
 */

const mysql = require("mysql2/promise");

const {
  MYSQL_HOST = "127.0.0.1",
  MYSQL_PORT = "3306",
  MYSQL_USER = "root",
  MYSQL_PASSWORD = "",
  MYSQL_DATABASE = "trt",
  FEES_WALLET = "", // optional, used by /status; empty = first/only row in indexer_cursor
} = process.env;

let pool;
async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: Number(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      charset: "utf8mb4_general_ci",
      supportBigNumbers: true,
      dateStrings: true,
    });
  }
  return pool;
}

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
exports.getEarningsTotals = async (req, res) => {
  try {
    const address = String(req.query.address || "").trim();
    if (!isNonEmptyString(address)) {
      return res.status(400).json({ error: "Missing ?address" });
    }

    const pool = await getPool();

    // Fetch SOL/USDC totals
    const [totalsRows] = await pool.execute(
      `SELECT sol_total, usdc_total, last_updated
       FROM rewards_totals
       WHERE wallet = ?`,
      [address]
    );

    let solTotal = 0;
    let usdcTotal = 0;
    let walletLastUpdated = null;

    if (totalsRows.length > 0) {
      const row = totalsRows[0];
      solTotal = Number(row.sol_total || 0);
      usdcTotal = Number(row.usdc_total || 0);
      walletLastUpdated = asISO(row.last_updated);
    }

    // Fetch other token totals (row-per-token)
    const [tokenRows] = await pool.execute(
      `SELECT token_mint, token_symbol, total_amount, last_updated
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
      const amount = Number(r.total_amount || 0);
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
    const [cursorRows] = await pool.execute(
      `SELECT updated_at FROM indexer_cursor ${FEES_WALLET ? "WHERE source_wallet = ?" : ""} LIMIT 1`,
      FEES_WALLET ? [FEES_WALLET] : []
    );
    if (cursorRows.length > 0) {
      lastUpdatedISO = asISO(cursorRows[0].updated_at);
    }

    // Fallback to the wallet-specific last_updated if cursor missing
    if (!lastUpdatedISO) {
      // max of wallet totals + token totals for this address
      const [maxRows] = await pool.execute(
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
exports.getEarningsHistory = async (req, res) => {
  try {
    const address = String(req.query.address || "").trim();
    if (!isNonEmptyString(address)) {
      return res.status(400).json({ error: "Missing ?address" });
    }

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "50", 10), 1), 200);
    const offset = (page - 1) * pageSize;

    const pool = await getPool();

    // Count total events for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS c FROM rewards_events WHERE wallet = ?`,
      [address]
    );
    const total = Number(countRows[0]?.c || 0);

    // Fetch page of events
    const [rows] = await pool.execute(
      `SELECT signature, slot, block_time, asset_type, token_mint, amount
       FROM rewards_events
       WHERE wallet = ?
       ORDER BY block_time DESC, slot DESC
       LIMIT ? OFFSET ?`,
      [address, pageSize, offset]
    );

    const events = rows.map((r) => ({
      signature: r.signature,
      slot: Number(r.slot),
      blockTimeISO: asISO(r.block_time),
      assetType: r.asset_type, // 'SOL' | 'SPL'
      tokenMint: r.token_mint || null,
      amount: Number(r.amount || 0),
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
};

/**
 * GET /api/earnings/leaderboard?asset=SOL|USDC|<mint>&limit=50&from=ISO&to=ISO
 * Returns: { asset, from, to, rows: [{wallet, amount}] }
 * - By default, lifetime totals:
 *   - SOL/USDC from rewards_totals
 *   - Other tokens from rewards_token_totals by token_mint
 * - If from/to provided, computes from rewards_events within the time window.
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const asset = String(req.query.asset || "").trim(); // 'SOL', 'USDC', or token mint
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
    const fromISO = req.query.from ? String(req.query.from) : null;
    const toISO = req.query.to ? String(req.query.to) : null;

    if (!isNonEmptyString(asset)) {
      return res.status(400).json({ error: "Missing ?asset (use SOL, USDC, or a token mint)" });
    }

    const pool = await getPool();

    // Time-bounded leaderboard → compute from events
    if (fromISO || toISO) {
      const where = ["asset_type = ?"];
      const params = [];

      if (asset.toUpperCase() === "SOL") {
        params.push("SOL");
        where.push("token_mint IS NULL");
      } else if (asset.toUpperCase() === "USDC") {
        params.push("SPL");
        where.push("token_mint IS NOT NULL");
        // If you want to strictly enforce USDC mint, specify it here:
        // where.push("token_mint = ?");
        // params.push("<USDC_MINT>");
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
        SELECT wallet, SUM(amount) AS total
        FROM rewards_events
        WHERE ${where.join(" AND ")}
        GROUP BY wallet
        ORDER BY total DESC
        LIMIT ?
      `;
      params.push(limit);

      const [rows] = await pool.execute(sql, params);
      return res.json({
        asset,
        from: fromISO || null,
        to: toISO || null,
        rows: rows.map((r) => ({ wallet: r.wallet, amount: Number(r.total || 0) })),
      });
    }

    // Lifetime leaderboard → read from totals tables
    if (asset.toUpperCase() === "SOL") {
      const [rows] = await pool.execute(
        `SELECT wallet, sol_total AS total
         FROM rewards_totals
         WHERE sol_total IS NOT NULL AND sol_total <> 0
         ORDER BY total DESC
         LIMIT ?`,
        [limit]
      );
      return res.json({
        asset: "SOL",
        from: null,
        to: null,
        rows: rows.map((r) => ({ wallet: r.wallet, amount: Number(r.total || 0) })),
      });
    }

    if (asset.toUpperCase() === "USDC") {
      const [rows] = await pool.execute(
        `SELECT wallet, usdc_total AS total
         FROM rewards_totals
         WHERE usdc_total IS NOT NULL AND usdc_total <> 0
         ORDER BY total DESC
         LIMIT ?`,
        [limit]
      );
      return res.json({
        asset: "USDC",
        from: null,
        to: null,
        rows: rows.map((r) => ({ wallet: r.wallet, amount: Number(r.total || 0) })),
      });
    }

    // Specific token mint lifetime board
    const [rows] = await pool.execute(
      `SELECT wallet, total_amount AS total
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
      rows: rows.map((r) => ({ wallet: r.wallet, amount: Number(r.total || 0) })),
    });
  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};

/**
 * GET /api/earnings/status
 * Returns: { sourceWallet, lastSignature, lastSlot, lastUpdatedISO }
 * - Exposes the indexer's watermark for ops/observability.
 */
exports.getIndexerStatus = async (_req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      `SELECT source_wallet, last_signature, last_slot, updated_at
       FROM indexer_cursor
       ${FEES_WALLET ? "WHERE source_wallet = ?" : ""}
       ORDER BY updated_at DESC
       LIMIT 1`,
      FEES_WALLET ? [FEES_WALLET] : []
    );

    if (rows.length === 0) {
      return res.json({
        sourceWallet: FEES_WALLET || null,
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
};
