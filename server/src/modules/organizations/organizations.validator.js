const createOrganization = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Organization name is required' });
    }
    next();
};

const updateOrganization = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Organization name is required' });
    }
    next();
};

module.exports = {
    createOrganization,
    updateOrganization
};
