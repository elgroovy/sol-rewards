import express from "express";
import {
  notify
} from "../controllers/rewardController.js";
import { requireApiKey } from "../middleware/auth.js";
import { adminLimiter } from "../middleware/rateLimiter.js";
import { validateNotifyPayload, handleValidationErrors } from "../middleware/validators.js";

const router = express.Router();

// Protected admin endpoint (requires API key)
router.post("/notify", adminLimiter, requireApiKey, validateNotifyPayload(), handleValidationErrors, notify);

export default router;
