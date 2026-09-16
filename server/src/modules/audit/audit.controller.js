const auditService = require('./audit.service');
const { successResponse } = require('../../lib/response');

const getAuditLogs = async (req, res, next) => {
    try {
        const logs = await auditService.getAuditLogs(req.tenantId, req.query);
        return successResponse(res, 200, 'Audit logs retrieved', logs);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAuditLogs
};
