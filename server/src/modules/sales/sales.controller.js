const salesService = require('./sales.service');
const { successResponse } = require('../../lib/response');

// Customers
const getCustomers = async (req, res, next) => {
    try {
        const customers = await salesService.getCustomers(req.tenantId);
        return successResponse(res, 200, 'Customers retrieved', customers);
    } catch (error) {
        next(error);
    }
};

const getCustomerById = async (req, res, next) => {
    try {
        const customer = await salesService.getCustomerById(req.tenantId, req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        return successResponse(res, 200, 'Customer retrieved', customer);
    } catch (error) {
        next(error);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const customer = await salesService.createCustomer(req.tenantId, req.body);
        return successResponse(res, 201, 'Customer created successfully', customer);
    } catch (error) {
        next(error);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        await salesService.updateCustomer(req.tenantId, req.params.id, req.body);
        return successResponse(res, 200, 'Customer updated successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const deleteCustomer = async (req, res, next) => {
    try {
        await salesService.deleteCustomer(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Customer deleted successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

// Quotes
const getQuotes = async (req, res, next) => {
    try {
        const quotes = await salesService.getQuotes(req.tenantId);
        return successResponse(res, 200, 'Quotes retrieved', quotes);
    } catch (error) {
        next(error);
    }
};

const createQuote = async (req, res, next) => {
    try {
        const quote = await salesService.createQuote(req.tenantId, req.body);
        return successResponse(res, 201, 'Quote created successfully', quote);
    } catch (error) {
        next(error);
    }
};

// Sales Orders
const getSalesOrders = async (req, res, next) => {
    try {
        const orders = await salesService.getSalesOrders(req.tenantId);
        return successResponse(res, 200, 'Sales orders retrieved', orders);
    } catch (error) {
        next(error);
    }
};

const getSalesOrderById = async (req, res, next) => {
    try {
        const order = await salesService.getSalesOrderById(req.tenantId, req.params.id);
        if (!order) return res.status(404).json({ error: 'Sales order not found' });
        return successResponse(res, 200, 'Sales order retrieved', order);
    } catch (error) {
        next(error);
    }
};

const createSalesOrder = async (req, res, next) => {
    try {
        const order = await salesService.createSalesOrder(req.tenantId, req.body);
        return successResponse(res, 201, 'Sales order created successfully', order);
    } catch (error) {
        next(error);
    }
};

const fulfillSalesOrder = async (req, res, next) => {
    try {
        const result = await salesService.fulfillSalesOrder(req.tenantId, req.params.id, req.body);
        return successResponse(res, 200, 'Sales order fulfilled and inventory deducted', result);
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        if (error.message.includes('Insufficient stock') || error.message.includes('already fulfilled')) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

const cancelSalesOrder = async (req, res, next) => {
    try {
        await salesService.cancelSalesOrder(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Sales order cancelled');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        if (error.message.includes('Cannot cancel')) return res.status(400).json({ error: error.message });
        next(error);
    }
};

// Invoices & Payments
const getInvoices = async (req, res, next) => {
    try {
        const invoices = await salesService.getInvoices(req.tenantId);
        return successResponse(res, 200, 'Invoices retrieved', invoices);
    } catch (error) {
        next(error);
    }
};

const getInvoiceById = async (req, res, next) => {
    try {
        const invoice = await salesService.getInvoiceById(req.tenantId, req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        return successResponse(res, 200, 'Invoice retrieved', invoice);
    } catch (error) {
        next(error);
    }
};

const recordPayment = async (req, res, next) => {
    try {
        const payment = await salesService.recordPayment(req.tenantId, req.params.id, req.body);
        return successResponse(res, 201, 'Payment recorded successfully', payment);
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        if (error.message.includes('already fully paid')) return res.status(400).json({ error: error.message });
        next(error);
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getQuotes,
    createQuote,
    getSalesOrders,
    getSalesOrderById,
    createSalesOrder,
    fulfillSalesOrder,
    cancelSalesOrder,
    getInvoices,
    getInvoiceById,
    recordPayment
};
