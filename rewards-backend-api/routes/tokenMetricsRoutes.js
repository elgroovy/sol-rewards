import express from 'express';
import {
  getTokenMetrics
} from '../controllers/tokenMetricsController.js';

const router = express.Router();

router.get('/', getTokenMetrics);

export default router;