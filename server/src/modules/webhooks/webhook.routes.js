const express = require('express');
const router = express.Router();
const webhookController = require('./webhook.controller');

// Import Middlewares
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

// Apply base authentication and tenant resolution to all routes
router.use(requireAuth);
router.use(resolveTenant);

// Routes
router.get(
    '/',
    requirePermission('billing:read'),
    webhookController.listWebhookEndpoints
);

router.post(
    '/',
    requirePermission('billing:write'),
    webhookController.createWebhookEndpoint
);

router.patch(
    '/:id',
    requirePermission('billing:write'),
    webhookController.updateWebhookEndpoint
);

router.delete(
    '/:id',
    requirePermission('billing:write'),
    webhookController.deleteWebhookEndpoint
);

module.exports = router;
