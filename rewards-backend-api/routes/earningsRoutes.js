import express from "express";
import {
  getEarningsTotals,
  getEarningsHistory,
  getLeaderboard,
  getIndexerStatus,
} from "../controllers/earningsController.js";

const router = express.Router();

// Totals for a wallet (SOL, USDC, other tokens) + lastUpdated watermark
router.get("/earnings", getEarningsTotals);

// Paginated payout history for a wallet (timeline/audit)
router.get("/earnings/history", getEarningsHistory);

// Leaderboard by asset (SOL/USDC/by token mint), optional time window
router.get("/earnings/leaderboard", getLeaderboard);

// Indexer/status (last cursor + watermark)
router.get("/earnings/status", getIndexerStatus);

export default router;
