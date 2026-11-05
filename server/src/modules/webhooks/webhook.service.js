const crypto = require('crypto');
const axios = require('axios');
const prisma = require('../../lib/prisma');
const { emitTenantEvent } = require('../../lib/socket');

/**
 * Webhook Service
 * Handles webhook endpoint management and event delivery
 */

// Create a new webhook endpoint
const createWebhookEndpoint = async (organizationId, userId, { url, events, description }) => {
    const secret = crypto.randomBytes(32).toString('hex');
    
    const webhook = await prisma.webhookEndpoint.create({
        data: {
            organizationId,
            url,
            secret,
            events: Array.isArray(events) ? events : [events],
            description: description || `Webhook for ${url}`,
            isActive: true
        }
    });
    
    // Log the action
    await prisma.auditLog.create({
        data: {
            organizationId,
            userId,
            action: 'CREATE',
            entityType: 'WEBHOOK_ENDPOINT',
            entityId: webhook.id,
            details: {
                url: webhook.url,
                events: webhook.events
            }
        }
    });
    
    return webhook;
};

// List webhook endpoints for an organization
const listWebhookEndpoints = async (organizationId) => {
    return await prisma.webhookEndpoint.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' }
    });
};

// Update a webhook endpoint
const updateWebhookEndpoint = async (organizationId, userId, webhookId, updates) => {
    const result = await prisma.webhookEndpoint.updateMany({
        where: { id: webhookId, organizationId },
        data: updates
    });
    
    if (result.count === 0) {
        throw new Error('Webhook endpoint not found or access denied');
    }
    
    // Log the action
    await prisma.auditLog.create({
        data: {
            organizationId,
            userId,
            action: 'UPDATE',
            entityType: 'WEBHOOK_ENDPOINT',
            entityId: webhookId,
            details: { updates }
        }
    });
    
    return result;
};

// Delete a webhook endpoint
const deleteWebhookEndpoint = async (organizationId, userId, webhookId) => {
    const result = await prisma.webhookEndpoint.deleteMany({
        where: { id: webhookId, organizationId }
    });
    
    if (result.count === 0) {
        throw new Error('Webhook endpoint not found or access denied');
    }
    
    // Log the action
    await prisma.auditLog.create({
        data: {
            organizationId,
            userId,
            action: 'DELETE',
            entityType: 'WEBHOOK_ENDPOINT',
            entityId: webhookId,
            details: { action: 'deleted' }
        }
    });
    
    return result;
};

// Send webhook event to all active endpoints
const sendWebhookEvent = async (organizationId, event, data) => {
    const endpoints = await prisma.webhookEndpoint.findMany({
        where: {
            organizationId,
            isActive: true,
            events: { contains: event }
        }
    });
    
    if (endpoints.length === 0) {
        return;
    }
    
    const payload = {
        event,
        organizationId,
        data,
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID()
    };
    
    // Send to all endpoints in parallel
    await Promise.allSettled(endpoints.map(async (endpoint) => {
        try {
            const signature = crypto
                .createHmac('sha256', endpoint.secret)
                .update(JSON.stringify(payload))
                .digest('hex');
            
            const response = await axios.post(endpoint.url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': event,
                    'X-Webhook-Id': payload.id
                },
                timeout: 10000 // 10 second timeout
            });
            
            // Record successful delivery
            await prisma.webhookDelivery.create({
                data: {
                    webhookEndpointId: endpoint.id,
                    event,
                    payload,
                    statusCode: response.status,
                    responseBody: response.data ? JSON.stringify(response.data).substring(0, 1000) : null,
                    attempts: 1,
                    success: true
                }
            });
            
        } catch (error) {
            // Record failed delivery
            await prisma.webhookDelivery.create({
                data: {
                    webhookEndpointId: endpoint.id,
                    event,
                    payload,
                    statusCode: error.response?.status || null,
                    responseBody: error.message || null,
                    attempts: 1,
                    success: false
                }
            });
        }
    }));
};

// Deliver a single webhook job (called by BullMQ workers in jobs/index.js and lib/jobQueue.js).
// job.data shape: { url, secret, payload, eventType, endpointId, organizationId }
const processWebhook = async ({ url, secret, payload, eventType, endpointId, organizationId }) => {
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-ERP-Webhook/1.0'
    };

    if (secret) {
        const payloadString = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', secret)
            .update(payloadString)
            .digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }
    if (eventType) headers['X-Webhook-Event'] = eventType;
    if (payload && payload.id) headers['X-Webhook-Id'] = payload.id;

    try {
        const response = await axios.post(url, payload, {
            headers,
            timeout: 10000
        });

        if (endpointId) {
            await prisma.webhookDelivery.create({
                data: {
                    webhookEndpointId: endpointId,
                    event: eventType || payload?.event || 'unknown',
                    payload: payload || {},
                    statusCode: response.status,
                    responseBody: response.data ? JSON.stringify(response.data).substring(0, 1000) : null,
                    attempts: 1,
                    success: true
                }
            });
        }
        return { success: true, statusCode: response.status };
    } catch (error) {
        if (endpointId) {
            await prisma.webhookDelivery.create({
                data: {
                    webhookEndpointId: endpointId,
                    event: eventType || payload?.event || 'unknown',
                    payload: payload || {},
                    statusCode: error.response?.status || null,
                    responseBody: error.message || null,
                    attempts: 1,
                    success: false
                }
            });
        }
        throw error;
    }
};

module.exports = {
    createWebhookEndpoint,
    listWebhookEndpoints,
    updateWebhookEndpoint,
    deleteWebhookEndpoint,
    sendWebhookEvent,
    processWebhook
};
