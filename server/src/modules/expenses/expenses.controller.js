const expensesService = require('./expenses.service');
const { successResponse } = require('../../lib/response');

const getCategories = async (req, res, next) => {
    try {
        const categories = await expensesService.getCategories(req.tenantId);
        return successResponse(res, 200, 'Expense categories retrieved', categories);
    } catch (error) {
        next(error);
    }
};

const createCategory = async (req, res, next) => {
    try {
        const category = await expensesService.createCategory(req.tenantId, req.body);
        return successResponse(res, 201, 'Expense category created', category);
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        await expensesService.deleteCategory(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Expense category deleted');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const getExpenses = async (req, res, next) => {
    try {
        const expenses = await expensesService.getExpenses(req.tenantId);
        return successResponse(res, 200, 'Expenses retrieved', expenses);
    } catch (error) {
        next(error);
    }
};

const getExpenseById = async (req, res, next) => {
    try {
        const expense = await expensesService.getExpenseById(req.tenantId, req.params.id);
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        return successResponse(res, 200, 'Expense retrieved', expense);
    } catch (error) {
        next(error);
    }
};

const createExpense = async (req, res, next) => {
    try {
        const expense = await expensesService.createExpense(req.tenantId, req.body);
        return successResponse(res, 201, 'Expense created successfully', expense);
    } catch (error) {
        next(error);
    }
};

const updateExpense = async (req, res, next) => {
    try {
        await expensesService.updateExpense(req.tenantId, req.params.id, req.body);
        return successResponse(res, 200, 'Expense updated successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const deleteExpense = async (req, res, next) => {
    try {
        await expensesService.deleteExpense(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Expense deleted successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

module.exports = {
    getCategories,
    createCategory,
    deleteCategory,
    getExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
};
