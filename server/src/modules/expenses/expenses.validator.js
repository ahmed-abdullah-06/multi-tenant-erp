const createCategory = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    next();
};

const createExpense = (req, res, next) => {
    const { amount, payee } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (!payee || typeof payee !== 'string') {
        return res.status(400).json({ error: 'Payee is required' });
    }
    next();
};

module.exports = {
    createCategory,
    createExpense
};
