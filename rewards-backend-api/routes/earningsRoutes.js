// rewards-backend-api/routes/earningsRoutes.js
const express = require('express');
const router = express.Router();
const earningsController = require('../controllers/earningsController');

/**
 * @route GET /api/earnings/:walletAddress
 * @desc Get total earnings for a given wallet address
 * @access Public
 */
router.get('/', earningsController.getEarningsByWalletAddress);

module.exports = router;