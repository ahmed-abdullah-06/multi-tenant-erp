const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authValidator = require('./auth.validator');
const { requireAuth } = require('../../middleware/authMiddleware');

// Import the new rate limiter
const { authLimiter } = require('../../middleware/rateLimiter');

// Apply the authLimiter strictly to endpoints vulnerable to brute-forcing
router.post('/register', authLimiter, authValidator.register, authController.register);
router.post('/login', authLimiter, authValidator.login, authController.login);

// Standard authenticated routes (can optionally use the general apiLimiter here later)
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;