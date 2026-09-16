const reportsService = require('./reports.service');
const { successResponse } = require('../../lib/response');

const getDashboardSummary = async (req, res, next) => {
    try {
        const summary = await reportsService.getDashboardSummary(req.tenantId);
        return successResponse(res, 200, 'Dashboard summary retrieved', summary);
    } catch (error) {
        next(error);
    }
};

const getSalesReport = async (req, res, next) => {
    try {
        const report = await reportsService.getSalesReport(req.tenantId);
        return successResponse(res, 200, 'Sales report retrieved', report);
    } catch (error) {
        next(error);
    }
};

const getInventoryReport = async (req, res, next) => {
    try {
        const report = await reportsService.getInventoryReport(req.tenantId);
        return successResponse(res, 200, 'Inventory report retrieved', report);
    } catch (error) {
        next(error);
    }
};

const getExpenseReport = async (req, res, next) => {
    try {
        const report = await reportsService.getExpenseReport(req.tenantId);
        return successResponse(res, 200, 'Expense report retrieved', report);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardSummary,
    getSalesReport,
    getInventoryReport,
    getExpenseReport
};
