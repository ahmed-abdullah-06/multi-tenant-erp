const rbacService = require('./rbac.service');
const { successResponse } = require('../../lib/response');

const getRoles = async (req, res, next) => {
    try {
        const roles = await rbacService.getRoles(req.tenantId);
        return successResponse(res, 200, 'Roles retrieved', roles);
    } catch (error) {
        next(error);
    }
};

const getRoleById = async (req, res, next) => {
    try {
        const role = await rbacService.getRoleById(req.tenantId, req.params.id);
        if (!role) return res.status(404).json({ error: 'Role not found' });
        return successResponse(res, 200, 'Role retrieved', role);
    } catch (error) {
        next(error);
    }
};

const createRole = async (req, res, next) => {
    try {
        const role = await rbacService.createRole(req.tenantId, req.body);
        return successResponse(res, 201, 'Role created successfully', role);
    } catch (error) {
        next(error);
    }
};

const updateRole = async (req, res, next) => {
    try {
        const role = await rbacService.updateRole(req.tenantId, req.params.id, req.body);
        return successResponse(res, 200, 'Role updated successfully', role);
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('system roles')) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

const deleteRole = async (req, res, next) => {
    try {
        await rbacService.deleteRole(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Role deleted successfully');
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('assigned to active')) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

const getPermissions = async (req, res, next) => {
    try {
        const permissions = await rbacService.getPermissions();
        return successResponse(res, 200, 'Permissions list retrieved', permissions);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getPermissions
};
