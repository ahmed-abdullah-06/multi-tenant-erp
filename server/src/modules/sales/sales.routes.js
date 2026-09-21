const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const salesValidator = require('./sales.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);
router.use(resolveTenant);

// Customers
router.get('/customers', requirePermission('sales:read'), salesController.getCustomers);
router.get('/customers/:id', requirePermission('sales:read'), salesController.getCustomerById);
router.post('/customers', requirePermission('sales:write'), salesValidator.createCustomer, salesController.createCustomer);
router.put('/customers/:id', requirePermission('sales:write'), salesController.updateCustomer);
router.delete('/customers/:id', requirePermission('sales:write'), salesController.deleteCustomer);

// Quotes
router.get('/quotes', requirePermission('sales:read'), salesController.getQuotes);
router.post('/quotes', requirePermission('sales:write'), salesController.createQuote);

// Sales Orders
router.get('/orders', requirePermission('sales:read'), salesController.getSalesOrders);
router.get('/orders/:id', requirePermission('sales:read'), salesController.getSalesOrderById);
router.post('/orders', requirePermission('sales:write'), salesValidator.createSalesOrder, salesController.createSalesOrder);
router.post('/orders/:id/fulfill', requirePermission('sales:write'), salesController.fulfillSalesOrder);
router.patch('/orders/:id/cancel', requirePermission('sales:write'), salesController.cancelSalesOrder);

// Invoices & Payments
router.get('/invoices', requirePermission('sales:read'), salesController.getInvoices);
router.get('/invoices/:id', requirePermission('sales:read'), salesController.getInvoiceById);
router.post('/invoices/:id/payments', requirePermission('sales:write'), salesValidator.recordPayment, salesController.recordPayment,requireIdempotency);

module.exports = router;
