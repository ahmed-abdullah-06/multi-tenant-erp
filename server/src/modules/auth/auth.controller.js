const authService = require('./auth.service');
const { successResponse } = require('../../lib/response');

const register = async (req, res, next) => {
    try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await authService.register(req.body, ipAddress, userAgent);
        return successResponse(res, 201, 'User registered successfully', result);
    } catch (error) {
        if (error.message.includes('Email already registered')) {
            return res.status(409).json({ error: error.message });
        }
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const result = await authService.login(req.body, ipAddress, userAgent);
        return successResponse(res, 200, 'Login successful', result);
    } catch (error) {
        if (error.message.includes('Invalid email or password')) {
            return res.status(401).json({ error: error.message });
        }
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await authService.refreshSession(refreshToken, ipAddress, userAgent);
        
        return successResponse(res, 200, 'Session refreshed successfully', {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
        });
    } catch (error) {
        return res.status(401).json({ error: error.message });
    }
};

const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        await authService.logout(req.user.id, refreshToken);
        return successResponse(res, 200, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

const me = async (req, res, next) => {
    try {
        const user = await authService.getCurrentUser(req.user.id);
        return successResponse(res, 200, 'User profile fetched successfully', user);
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        // Pass the frontend origin so the email link points to the correct domain
        const originUrl = req.headers.origin || `http://${req.headers.host}`;
        
        await authService.forgotPassword(email, originUrl);
        
        return successResponse(res, 200, 'If an account with that email exists, a reset link has been sent.');
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;
        
        await authService.resetPassword(token, newPassword);
        
        return successResponse(res, 200, 'Password has been reset successfully. You may now log in.');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    me,
    forgotPassword,
    resetPassword
};