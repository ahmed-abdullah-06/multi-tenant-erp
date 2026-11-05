const express = require('express');
const router = express.Router();
const apikeyController = require('./apikey.controller');

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
    apikeyController.listApiKeys
);

router.post(
    '/',
    requirePermission('billing:write'),
    apikeyController.createApiKey
);

router.delete(
    '/:id',
    requirePermission('billing:write'),
    apikeyController.revokeApiKey
);

module.exports = router;
