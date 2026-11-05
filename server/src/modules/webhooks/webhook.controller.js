const webhookService = require('./webhook.service');
const { successResponse } = require('../../lib/response');

const createWebhookEndpoint = async (req, res, next) => {
    try {
        const { url, events, description } = req.body;
        const webhook = await webhookService.createWebhookEndpoint(
            req.tenantId,
            req.user.id,
            { url, events, description }
        );
        return successResponse(res, 201, 'Webhook endpoint created successfully', webhook);
    } catch (error) {
        next(error);
    }
};

const listWebhookEndpoints = async (req, res, next) => {
    try {
        const webhooks = await webhookService.listWebhookEndpoints(req.tenantId);
        return successResponse(res, 200, 'Webhook endpoints retrieved successfully', webhooks);
    } catch (error) {
        next(error);
    }
};

const updateWebhookEndpoint = async (req, res, next) => {
    try {
        const { url, events, description, isActive } = req.body;
        const updates = {};
        if (url) updates.url = url;
        if (events) updates.events = events;
        if (description) updates.description = description;
        if (isActive !== undefined) updates.isActive = isActive;
        
        await webhookService.updateWebhookEndpoint(
            req.tenantId,
            req.user.id,
            req.params.id,
            updates
        );
        return successResponse(res, 200, 'Webhook endpoint updated successfully');
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
};

const deleteWebhookEndpoint = async (req, res, next) => {
    try {
        await webhookService.deleteWebhookEndpoint(req.tenantId, req.user.id, req.params.id);
        return successResponse(res, 200, 'Webhook endpoint deleted successfully');
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
};

module.exports = {
    createWebhookEndpoint,
    listWebhookEndpoints,
    updateWebhookEndpoint,
    deleteWebhookEndpoint
};
