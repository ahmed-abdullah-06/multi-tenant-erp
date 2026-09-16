const updateMemberRole = (req, res, next) => {
    const { roleId } = req.body;
    if (!roleId || typeof roleId !== 'string') {
        return res.status(400).json({ error: 'Valid roleId is required' });
    }
    next();
};

const createInvitation = (req, res, next) => {
    const { email, roleId } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!roleId || typeof roleId !== 'string') {
        return res.status(400).json({ error: 'Valid roleId is required' });
    }
    next();
};

module.exports = {
    updateMemberRole,
    createInvitation
};
