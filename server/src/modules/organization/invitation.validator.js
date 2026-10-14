const sendInvite = (req, res, next) => {
    const { email, role } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!role || typeof role !== 'string') {
        return res.status(400).json({ error: 'A role is required (e.g., ADMIN, USER)' });
    }
    next();
};

const acceptInvite = (req, res, next) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Invitation token is required' });
    }
    next();
};

module.exports = { sendInvite, acceptInvite };