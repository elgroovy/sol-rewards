const express = require('express');
const router = express.Router();
const jackpotController = require('../controllers/jackpotController');

router.post('/notifications', jackpotController.notify);
router.put('/holders', jackpotController.updateEligibleHolders);
router.get('/holders', jackpotController.getEligibleHolders);
router.get('/test', jackpotController.test);

module.exports = router;