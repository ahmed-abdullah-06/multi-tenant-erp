const express = require('express');
const router = express.Router();
const purchasingController = require('./purchasing.controller');
const purchasingValidator = require('./purchasing.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);
router.use(resolveTenant);

// Suppliers
router.get('/suppliers', requirePermission('purchasing:read'), purchasingController.getSuppliers);
router.get('/suppliers/:id', requirePermission('purchasing:read'), purchasingController.getSupplierById);
router.post('/suppliers', requirePermission('purchasing:write'), purchasingValidator.createSupplier, purchasingController.createSupplier);
router.put('/suppliers/:id', requirePermission('purchasing:write'), purchasingController.updateSupplier);
router.delete('/suppliers/:id', requirePermission('purchasing:write'), purchasingController.deleteSupplier);

// Purchase Orders
router.get('/orders', requirePermission('purchasing:read'), purchasingController.getPurchaseOrders);
router.get('/orders/:id', requirePermission('purchasing:read'), purchasingController.getPurchaseOrderById);
router.post('/orders', requirePermission('purchasing:write'), purchasingValidator.createPurchaseOrder, purchasingController.createPurchaseOrder);
router.post('/orders/:id/receive', requirePermission('purchasing:write'), purchasingController.receivePurchaseOrder);
router.patch('/orders/:id/cancel', requirePermission('purchasing:write'), purchasingController.cancelPurchaseOrder);

module.exports = router;
