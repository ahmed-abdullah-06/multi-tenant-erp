const createSupplier = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Supplier name is required' });
    }
    next();
};

const createPurchaseOrder = (req, res, next) => {
    const { supplierId, items } = req.body;
    if (!supplierId || typeof supplierId !== 'string') {
        return res.status(400).json({ error: 'Valid supplierId is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array cannot be empty' });
    }
    for (const item of items) {
        if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
            return res.status(400).json({ error: 'Each item must have a valid productId and positive quantity' });
        }
    }
    next();
};

module.exports = {
    createSupplier,
    createPurchaseOrder
};
