const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');
const inventoryValidator = require('./inventory.validator');

// Import Middlewares
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

// Apply base authentication and tenant resolution to all routes in this module
router.use(requireAuth);
router.use(resolveTenant);

// Routes
router.post(
    '/', 
    requirePermission('inventory:write'), 
    requirePlanFeature('MAX_PRODUCTS'), // <-- Plan Enforcement Guard
    inventoryValidator.createProduct,
    inventoryController.createProduct
);

router.get(
    '/', 
    requirePermission('inventory:read'), 
    inventoryController.getProducts
);

router.get(
    '/:id', 
    requirePermission('inventory:read'), 
    inventoryController.getProductById
);

router.patch(
    '/:id/stock', 
    requirePermission('inventory:write'), 
    inventoryValidator.adjustStock,
    inventoryController.adjustStock
);

router.delete(
    '/:id', 
    requirePermission('inventory:write'), 
    inventoryController.deleteProduct
);

// Add this new route, for example, just below the POST '/' route
router.post(
    '/transfer', 
    requirePermission('inventory:write'), 
    inventoryValidator.transferStock, 
    inventoryController.transferStock
);


module.exports = router;
