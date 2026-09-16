const purchasingService = require('./purchasing.service');
const { successResponse } = require('../../lib/response');

// Suppliers
const getSuppliers = async (req, res, next) => {
    try {
        const suppliers = await purchasingService.getSuppliers(req.tenantId);
        return successResponse(res, 200, 'Suppliers retrieved', suppliers);
    } catch (error) {
        next(error);
    }
};

const getSupplierById = async (req, res, next) => {
    try {
        const supplier = await purchasingService.getSupplierById(req.tenantId, req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        return successResponse(res, 200, 'Supplier retrieved', supplier);
    } catch (error) {
        next(error);
    }
};

const createSupplier = async (req, res, next) => {
    try {
        const supplier = await purchasingService.createSupplier(req.tenantId, req.body);
        return successResponse(res, 201, 'Supplier created successfully', supplier);
    } catch (error) {
        next(error);
    }
};

const updateSupplier = async (req, res, next) => {
    try {
        await purchasingService.updateSupplier(req.tenantId, req.params.id, req.body);
        return successResponse(res, 200, 'Supplier updated successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const deleteSupplier = async (req, res, next) => {
    try {
        await purchasingService.deleteSupplier(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Supplier deleted successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

// Purchase Orders
const getPurchaseOrders = async (req, res, next) => {
    try {
        const orders = await purchasingService.getPurchaseOrders(req.tenantId);
        return successResponse(res, 200, 'Purchase orders retrieved', orders);
    } catch (error) {
        next(error);
    }
};

const getPurchaseOrderById = async (req, res, next) => {
    try {
        const order = await purchasingService.getPurchaseOrderById(req.tenantId, req.params.id);
        if (!order) return res.status(404).json({ error: 'Purchase order not found' });
        return successResponse(res, 200, 'Purchase order retrieved', order);
    } catch (error) {
        next(error);
    }
};

const createPurchaseOrder = async (req, res, next) => {
    try {
        const order = await purchasingService.createPurchaseOrder(req.tenantId, req.body);
        return successResponse(res, 201, 'Purchase order created successfully', order);
    } catch (error) {
        next(error);
    }
};

const receivePurchaseOrder = async (req, res, next) => {
    try {
        const receipt = await purchasingService.receivePurchaseOrder(req.tenantId, req.params.id, req.body);
        return successResponse(res, 200, 'Purchase order received and inventory updated', receipt);
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        if (error.message.includes('Cannot receive')) return res.status(400).json({ error: error.message });
        next(error);
    }
};

const cancelPurchaseOrder = async (req, res, next) => {
    try {
        await purchasingService.cancelPurchaseOrder(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Purchase order cancelled');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        if (error.message.includes('Cannot cancel')) return res.status(400).json({ error: error.message });
        next(error);
    }
};

module.exports = {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder
};
