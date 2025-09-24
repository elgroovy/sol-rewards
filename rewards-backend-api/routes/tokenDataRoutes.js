const express = require('express');
const router = express.Router();
const tokenDataController = require('../controllers/tokenDataController');

router.get('/', tokenDataController.getTokenData);

module.exports = router;