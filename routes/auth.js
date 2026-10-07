const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// @desc    Register a new user
router.post('/register', registerUser);

// @desc    Auth user & get token
router.post('/login', loginUser);

// @desc    Get user profile
router.get('/me', protect, getUserProfile);

module.exports = router;

module.exports = router;
