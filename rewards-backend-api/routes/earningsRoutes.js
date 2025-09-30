import express from "express";
import {
  getEarningsTotals,
  getEarningsHistory,
  getLeaderboard,
  getIndexerStatus,
} from "../controllers/earningsController.js";

const router = express.Router();

// Totals for a wallet (SOL, USDC, other tokens) + lastUpdated watermark
router.get("/", getEarningsTotals);

// Paginated payout history for a wallet (timeline/audit)
router.get("/history", getEarningsHistory);

// Leaderboard by asset (SOL/USDC/by token mint), optional time window
router.get("/leaderboard", getLeaderboard);

// Indexer/status (last cursor + watermark)
router.get("/status", getIndexerStatus);

export default router;
