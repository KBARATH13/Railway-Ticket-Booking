const express = require('express');
const router = express.Router();
const { createBooking, getBookings } = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

// POST /api/bookings — create a booking with smart seat allocation
router.post('/', protect, createBooking);

// GET /api/bookings
router.get('/', protect, getBookings);

module.exports = router;
