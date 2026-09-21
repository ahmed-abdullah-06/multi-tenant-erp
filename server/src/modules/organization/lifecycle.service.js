const prisma = require('../../lib/prisma');

/**
 * Safely soft-deletes a record instead of destroying it permanently.
 */
const softDeleteRecord = async (organizationId, modelName, recordId) => {
    // Dynamically access the Prisma model based on the provided string
    const model = prisma[modelName];
    
    if (!model) {
        throw new Error(`Model ${modelName} does not exist.`);
    }

    // Ensure the record belongs to the requesting tenant before deleting
    const record = await model.findFirst({
        where: { id: recordId, organizationId }
    });

    if (!record) {
        throw new Error('Record not found or access denied.');
    }

    return await model.update({
        where: { id: recordId },
        data: { deletedAt: new Date() }
    });
};

/**
 * Restores a previously soft-deleted record.
 */
const recoverRecord = async (organizationId, modelName, recordId) => {
    const model = prisma[modelName];

    const record = await model.findFirst({
        where: { id: recordId, organizationId, deletedAt: { not: null } }
    });

    if (!record) {
        throw new Error('Deleted record not found in trash.');
    }

    return await model.update({
        where: { id: recordId },
        data: { deletedAt: null }
    });
};

/**
 * Fetches the tenant's "Trash Bin" for a specific model.
 */
const getTrash = async (organizationId, modelName) => {
    const model = prisma[modelName];
    
    return await model.findMany({
        where: { 
            organizationId, 
            deletedAt: { not: null } 
        },
        orderBy: { deletedAt: 'desc' }
    });
};

module.exports = {
    softDeleteRecord,
    recoverRecord,
    getTrash
};