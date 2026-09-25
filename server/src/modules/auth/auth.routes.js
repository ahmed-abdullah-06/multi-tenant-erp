const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authValidator = require('./auth.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { authLimiter } = require('../../middleware/rateLimiter');

router.post('/register', authLimiter, authValidator.register, authController.register);
router.post('/login', authLimiter, authValidator.login, authController.login);

// New Refresh Route
router.post('/refresh', authLimiter, authController.refreshToken);

// Standard authenticated routes
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

// Add these to your public, unauthenticated routes
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

module.exports = router;