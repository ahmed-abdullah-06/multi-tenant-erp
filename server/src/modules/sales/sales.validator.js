const createCustomer = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Customer name is required' });
    }
    next();
};

const createSalesOrder = (req, res, next) => {
    const { customerId, items } = req.body;
    if (!customerId || typeof customerId !== 'string') {
        return res.status(400).json({ error: 'Valid customerId is required' });
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

const recordPayment = (req, res, next) => {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }
    next();
};

module.exports = {
    createCustomer,
    createSalesOrder,
    recordPayment
};
