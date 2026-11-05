const apikeyService = require('./apikey.service');
const { successResponse } = require('../../lib/response');

const createApiKey = async (req, res, next) => {
    try {
        const { name, expiresInDays } = req.body;
        const result = await apikeyService.createApiKey(
            req.tenantId,
            req.user.id,
            { name, expiresInDays }
        );
        return successResponse(res, 201, 'API key created successfully', result);
    } catch (error) {
        next(error);
    }
};

const listApiKeys = async (req, res, next) => {
    try {
        const keys = await apikeyService.listApiKeys(req.tenantId);
        return successResponse(res, 200, 'API keys retrieved successfully', keys);
    } catch (error) {
        next(error);
    }
};

const revokeApiKey = async (req, res, next) => {
    try {
        await apikeyService.revokeApiKey(req.tenantId, req.user.id, req.params.id);
        return successResponse(res, 200, 'API key revoked successfully');
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
};

module.exports = {
    createApiKey,
    listApiKeys,
    revokeApiKey
};
