const express = require('express');
const router  = express.Router();
const { getTickerItems } = require('../controllers/tickerController');

router.get('/', getTickerItems);

module.exports = router;
