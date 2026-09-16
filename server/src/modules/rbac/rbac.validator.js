const createRole = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Role name is required' });
    }
    next();
};

const updateRole = (req, res, next) => {
    const { name } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        return res.status(400).json({ error: 'Role name must be a non-empty string' });
    }
    next();
};

module.exports = {
    createRole,
    updateRole
};
