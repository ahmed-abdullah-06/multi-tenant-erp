const authService = require('./auth.service');
const { successResponse } = require('../../lib/response');

const register = async (req, res, next) => {
    try {
        const result = await authService.register(req.body);
        return successResponse(res, 201, 'User registered successfully', result);
    } catch (error) {
        if (error.message.includes('already registered')) {
            return res.status(409).json({ error: error.message });
        }
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);
        return successResponse(res, 200, 'Login successful', result);
    } catch (error) {
        if (error.message.includes('Invalid email or password')) {
            return res.status(401).json({ error: error.message });
        }
        next(error);
    }
};

const me = async (req, res, next) => {
    try {
        const activeOrgId = req.headers['x-organization-id'];
        const user = await authService.getCurrentUser(req.user.id, activeOrgId);
        return successResponse(res, 200, 'User profile retrieved', user);
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        return successResponse(res, 200, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    me,
    logout
};
