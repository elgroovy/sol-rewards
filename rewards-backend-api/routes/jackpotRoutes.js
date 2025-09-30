import express from "express";
import {
  notify,
  updateEligibleHolders,
  getEligibleHolders,
} from "../controllers/jackpotController.js";

const router = express.Router();

router.post("/notifications", notify);
router.put("/holders", updateEligibleHolders);
router.get("/holders", getEligibleHolders);

export default router;
