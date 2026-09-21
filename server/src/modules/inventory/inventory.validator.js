const adjustStock = (req, res, next) => {
    const { quantityChange } = req.body;
    if (typeof quantityChange !== 'number' || !Number.isInteger(quantityChange) || quantityChange === 0) {
        return res.status(400).json({ error: 'quantityChange must be a non-zero integer' });
    }
    next();
};

const createProduct = (req, res, next) => {
    const { name, stock, price } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Product name is required' });
    }
    if (stock !== undefined && (typeof stock !== 'number' || stock < 0)) {
        return res.status(400).json({ error: 'stock must be a non-negative number' });
    }
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
        return res.status(400).json({ error: 'price must be a non-negative number' });
    }
    next();
};

const transferStock = (req, res, next) => {
    const { sourceWarehouseId, destWarehouseId, items } = req.body;
    
    if (!sourceWarehouseId || typeof sourceWarehouseId !== 'string') {
        return res.status(400).json({ error: 'Valid sourceWarehouseId is required' });
    }
    if (!destWarehouseId || typeof destWarehouseId !== 'string') {
        return res.status(400).json({ error: 'Valid destWarehouseId is required' });
    }
    if (sourceWarehouseId === destWarehouseId) {
        return res.status(400).json({ error: 'Source and destination warehouses must be different' });
    }
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array cannot be empty' });
    }
    
    for (const item of items) {
        if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
            return res.status(400).json({ error: 'Each item must have a valid productId and a positive quantity' });
        }
    }
    next();
};

const adjustStockSafely = (req, res, next) => {
    const { currentVersion, quantityChange } = req.body;
    
    if (typeof currentVersion !== 'number' || !Number.isInteger(currentVersion) || currentVersion < 1) {
        return res.status(400).json({ error: 'currentVersion must be a positive integer' });
    }
    if (typeof quantityChange !== 'number' || !Number.isInteger(quantityChange) || quantityChange === 0) {
        return res.status(400).json({ error: 'quantityChange must be a non-zero integer' });
    }
    
    next();
};

module.exports = { 
    adjustStock, 
    createProduct, 
    transferStock, 
    adjustStockSafely // <-- Add to exports
};