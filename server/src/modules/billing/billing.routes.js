const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const webhookHandler = require('./billing.webhook');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);

// Plans can be listed without tenant context
router.get('/plans', billingController.getPlans);

// Standard API route for generating the checkout session
router.post('/checkout', requireAuth, billingController.createSubscriptionCheckout);

// Subscription requires tenant context
router.get('/subscription', resolveTenant, requirePermission('billing:read'), billingController.getSubscription);
router.post('/subscription', resolveTenant, requirePermission('billing:write'), billingController.updateSubscription);

// Webhook route - CRITICAL: Must use express.raw() to bypass the global express.json() parser
router.post(
    '/webhook', 
    express.raw({ type: 'application/json' }), 
    webhookHandler.handleStripeWebhook
);

module.exports = router;
