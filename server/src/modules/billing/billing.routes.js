const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);

// Plans can be listed without tenant context
router.get('/plans', billingController.getPlans);

// Subscription requires tenant context
router.get('/subscription', resolveTenant, requirePermission('billing:read'), billingController.getSubscription);
router.post('/subscription', resolveTenant, requirePermission('billing:write'), billingController.updateSubscription);

module.exports = router;
