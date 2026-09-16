const inventoryService = require('./inventory.service');
const { successResponse } = require('../../lib/response');

const createProduct = async (req, res, next) => {
    try {
        const product = await inventoryService.createProduct(req.tenantId, req.body);
        return successResponse(res, 201, 'Product created successfully', product);
    } catch (error) {
        next(error);
    }
};

const getProducts = async (req, res, next) => {
    try {
        const products = await inventoryService.getProducts(req.tenantId);
        return successResponse(res, 200, 'Products retrieved successfully', products);
    } catch (error) {
        next(error);
    }
};

const getProductById = async (req, res, next) => {
    try {
        const product = await inventoryService.getProductById(req.tenantId, req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return successResponse(res, 200, 'Product retrieved successfully', product);
    } catch (error) {
        next(error);
    }
};

const adjustStock = async (req, res, next) => {
    try {
        const { quantityChange } = req.body;
        await inventoryService.adjustStock(req.tenantId, req.params.id, quantityChange);
        return successResponse(res, 200, 'Stock adjusted successfully');
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        await inventoryService.deleteProduct(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Product deleted successfully');
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
};

const transferStock = async (req, res, next) => {
    try {
        const { sourceWarehouseId, destWarehouseId, items, notes } = req.body;
        const transfer = await inventoryService.transferStock(
            req.tenantId, 
            sourceWarehouseId, 
            destWarehouseId, 
            items, 
            notes
        );
        return successResponse(res, 201, 'Stock transferred successfully', transfer);
    } catch (error) {
        // Catch the specific service errors we threw and return a 400 Bad Request
        if (error.message.includes('not found') || error.message.includes('Insufficient stock')) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

// Add to your module.exports at the bottom
module.exports = {
    createProduct,
    getProducts,
    getProductById,
    adjustStock,
    deleteProduct,
    transferStock // <-- Add this
};