import express from "express";
import {
  notify
} from "../controllers/rewardController.js";

const router = express.Router();

router.post("/notifications", notify);

export default router;
