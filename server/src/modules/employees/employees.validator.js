const createDepartment = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Department name is required' });
    }
    next();
};

const createEmployee = (req, res, next) => {
    const { firstName, lastName, email } = req.body;
    if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
        return res.status(400).json({ error: 'First name is required' });
    }
    if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
        return res.status(400).json({ error: 'Last name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    next();
};

const updateEmployee = (req, res, next) => {
    const { email } = req.body;
    if (email !== undefined && (typeof email !== 'string' || !email.includes('@'))) {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    next();
};

module.exports = {
    createDepartment,
    createEmployee,
    updateEmployee
};
