const express = require('express');
const router = express.Router();
const expensesController = require('./expenses.controller');
const expensesValidator = require('./expenses.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);
router.use(resolveTenant);

// Categories
router.get('/categories', requirePermission('expenses:read'), expensesController.getCategories);
router.post('/categories', requirePermission('expenses:write'), expensesValidator.createCategory, expensesController.createCategory);
router.delete('/categories/:id', requirePermission('expenses:write'), expensesController.deleteCategory);

// Expenses
router.get('/', requirePermission('expenses:read'), expensesController.getExpenses);
router.get('/:id', requirePermission('expenses:read'), expensesController.getExpenseById);
router.post('/', requirePermission('expenses:write'), expensesValidator.createExpense, expensesController.createExpense);
router.put('/:id', requirePermission('expenses:write'), expensesController.updateExpense);
router.delete('/:id', requirePermission('expenses:write'), expensesController.deleteExpense);

module.exports = router;
