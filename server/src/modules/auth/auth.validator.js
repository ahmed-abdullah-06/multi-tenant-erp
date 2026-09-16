const register = (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    next();
};

const login = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Password is required' });
    }
    next();
};

module.exports = {
    register,
    login
};
