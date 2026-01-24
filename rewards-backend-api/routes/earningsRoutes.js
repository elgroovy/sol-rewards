import express from "express";
import {
  getEarningsTotals,
  getEarningsHistory,
  getLeaderboard,
  getIndexerStatus,
  getPendingRewards,
} from "../controllers/earningsController.js";
import {
  validateWalletAddress,
  validatePagination,
  validateLeaderboardParams,
  handleValidationErrors,
} from "../middleware/validators.js";

const router = express.Router();

// Totals for a wallet (SOL, USDC, other tokens) + lastUpdated watermark
router.get("/", validateWalletAddress(), handleValidationErrors, getEarningsTotals);

// Paginated payout history for a wallet (timeline/audit)
router.get("/history", validateWalletAddress(), validatePagination(), handleValidationErrors, getEarningsHistory);

// Leaderboard by asset (SOL/USDC/by token mint), optional time window
router.get("/leaderboard", validateLeaderboardParams(), handleValidationErrors, getLeaderboard);

// Indexer/status (last cursor + watermark)
router.get("/status", getIndexerStatus);

// Pending rewards for a wallet (accumulated but not yet distributed)
router.get("/pending", validateWalletAddress(), handleValidationErrors, getPendingRewards);

export default router;
