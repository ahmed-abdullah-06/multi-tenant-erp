const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const { emitTenantEvent } = require('../../lib/socket');

/**
 * API Key Service
 * Handles API key creation, validation, and management
 */

// Generate a new API key
const generateApiKey = () => {
    const prefix = 'erp_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const apiKey = `${prefix}${randomBytes}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 10); // First 10 chars for display
    
    return { apiKey, keyHash, keyPrefix };
};

// Create a new API key for an organization
const createApiKey = async (organizationId, userId, { name, expiresInDays = 365 }) => {
    const { apiKey, keyHash, keyPrefix } = generateApiKey();
    
    const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;
    
    const apiKeyRecord = await prisma.apiKey.create({
        data: {
            organizationId,
            name,
            keyHash,
            prefix: keyPrefix,
            expiresAt
        }
    });
    
    // Log the action
    await prisma.auditLog.create({
        data: {
            organizationId,
            userId,
            action: 'CREATE',
            entityType: 'API_KEY',
            entityId: apiKeyRecord.id,
            details: {
                keyName: name,
                keyPrefix,
                expiresAt
            }
        }
    });
    
    return {
        apiKey,
        key: {
            id: apiKeyRecord.id,
            name: apiKeyRecord.name,
            prefix: apiKeyRecord.prefix,
            expiresAt: apiKeyRecord.expiresAt,
            createdAt: apiKeyRecord.createdAt
        }
    };
};

// Validate an API key and return the organization ID
const validateApiKey = async (apiKey) => {
    if (!apiKey || !apiKey.startsWith('erp_')) {
        return null;
    }
    
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { organization: true }
    });
    
    if (!apiKeyRecord) {
        return null;
    }
    
    // Check if expired
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        return null;
    }
    
    // Update last used timestamp (async, don't wait)
    prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() }
    }).catch(() => {});
    
    return {
        organizationId: apiKeyRecord.organizationId,
        keyId: apiKeyRecord.id,
        keyName: apiKeyRecord.name
    };
};

// List API keys for an organization
const listApiKeys = async (organizationId) => {
    return await prisma.apiKey.findMany({
        where: { organizationId },
        select: {
            id: true,
            name: true,
            prefix: true,
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    });
};

// Revoke an API key
const revokeApiKey = async (organizationId, userId, keyId) => {
    const result = await prisma.apiKey.deleteMany({
        where: { id: keyId, organizationId }
    });
    
    if (result.count === 0) {
        throw new Error('API key not found or access denied');
    }
    
    // Log the action
    await prisma.auditLog.create({
        data: {
            organizationId,
            userId,
            action: 'DELETE',
            entityType: 'API_KEY',
            entityId: keyId,
            details: { action: 'revoked' }
        }
    });
    
    return result;
};

module.exports = {
    createApiKey,
    validateApiKey,
    listApiKeys,
    revokeApiKey,
    generateApiKey
};
