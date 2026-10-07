const express = require('express');
const router = express.Router();
const { getTrains } = require('../controllers/trainController');

// GET /api/trains — return all trains with live seat counts and row info
router.get('/', getTrains);

module.exports = router;

module.exports = router;
