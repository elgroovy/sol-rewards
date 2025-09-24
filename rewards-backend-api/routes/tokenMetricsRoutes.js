const express = require('express');
const router = express.Router();
const tokenDataController = require('../controllers/tokenMetricsController');

router.get('/', tokenDataController.getTokenMetrics);

module.exports = router;