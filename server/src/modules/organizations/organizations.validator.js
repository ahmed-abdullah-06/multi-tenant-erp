const createOrganization = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Organization name is required' });
    }
    next();
};

const updateOrganization = (req, res, next) => {
    const { name, currency, timezone } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        return res.status(400).json({ error: 'Organization name must be a non-empty string' });
    }
    if (currency !== undefined && (typeof currency !== 'string' || currency.trim().length === 0)) {
        return res.status(400).json({ error: 'Currency must be a non-empty string' });
    }
    if (timezone !== undefined && (typeof timezone !== 'string' || timezone.trim().length === 0)) {
        return res.status(400).json({ error: 'Timezone must be a non-empty string' });
    }
    if (name === undefined && currency === undefined && timezone === undefined) {
        return res.status(400).json({ error: 'At least one field to update is required' });
    }
    next();
};

module.exports = {
    createOrganization,
    updateOrganization
};
