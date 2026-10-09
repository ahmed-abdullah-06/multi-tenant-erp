const getAuditLogs = (req, res, next) => {
    const { limit, entityType, action } = req.query;

    if (limit && (isNaN(parseInt(limit, 10)) || parseInt(limit, 10) <= 0)) {
        return res.status(400).json({ error: 'limit must be a positive integer' });
    }
    if (entityType && typeof entityType !== 'string') {
        return res.status(400).json({ error: 'entityType must be a string' });
    }
    if (action && typeof action !== 'string') {
        return res.status(400).json({ error: 'action must be a string' });
    }
    
    next();
};

module.exports = { getAuditLogs };