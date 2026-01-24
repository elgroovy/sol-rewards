import express from "express";
import {
  notify,
  updateEligibleHolders,
  getEligibleHolders,
} from "../controllers/jackpotController.js";
import { requireApiKey } from "../middleware/auth.js";
import { adminLimiter } from "../middleware/rateLimiter.js";
import { validateHoldersUpdate, validateNotifyPayload, handleValidationErrors } from "../middleware/validators.js";

const router = express.Router();

// Protected admin endpoints (require API key)
router.post("/notify", adminLimiter, requireApiKey, validateNotifyPayload(), handleValidationErrors, notify);
router.put("/holders", adminLimiter, requireApiKey, validateHoldersUpdate(), handleValidationErrors, updateEligibleHolders);

// Public endpoint (rate-limited globally in server.js)
router.get("/holders", getEligibleHolders);

export default router;
