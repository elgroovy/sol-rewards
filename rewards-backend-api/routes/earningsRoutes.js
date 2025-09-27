const express = require("express");
const router = express.Router();
const earnings = require("./earningsController");

// Totals for a wallet (SOL, USDC, other tokens) + lastUpdated watermark
router.get("/earnings", earnings.getEarningsTotals);

// Paginated payout history for a wallet (timeline/audit)
router.get("/earnings/history", earnings.getEarningsHistory);

// Leaderboard by asset (SOL/USDC/by token mint), optional time window
router.get("/earnings/leaderboard", earnings.getLeaderboard);

// Indexer/status (last cursor + watermark)
router.get("/earnings/status", earnings.getIndexerStatus);

module.exports = router;
