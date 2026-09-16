const usersService = require('./users.service');
const { successResponse } = require('../../lib/response');

const getMembers = async (req, res, next) => {
    try {
        const members = await usersService.getMembers(req.tenantId);
        return successResponse(res, 200, 'Organization members retrieved', members);
    } catch (error) {
        next(error);
    }
};

const getMemberById = async (req, res, next) => {
    try {
        const member = await usersService.getMemberById(req.tenantId, req.params.id);
        if (!member) return res.status(404).json({ error: 'Member not found' });
        return successResponse(res, 200, 'Member retrieved', member);
    } catch (error) {
        next(error);
    }
};

const updateMemberRole = async (req, res, next) => {
    try {
        await usersService.updateMemberRole(req.tenantId, req.params.id, req.body.roleId);
        return successResponse(res, 200, 'Member role updated successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const removeMember = async (req, res, next) => {
    try {
        await usersService.removeMember(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Member removed from organization');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const createInvitation = async (req, res, next) => {
    try {
        const invitation = await usersService.createInvitation(req.tenantId, req.user.id, req.body);
        return successResponse(res, 201, 'Invitation created successfully', invitation);
    } catch (error) {
        if (error.message.includes('already a member')) return res.status(409).json({ error: error.message });
        next(error);
    }
};

const getInvitations = async (req, res, next) => {
    try {
        const invitations = await usersService.getInvitations(req.tenantId);
        return successResponse(res, 200, 'Invitations retrieved', invitations);
    } catch (error) {
        next(error);
    }
};

const cancelInvitation = async (req, res, next) => {
    try {
        await usersService.cancelInvitation(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Invitation cancelled successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

module.exports = {
    getMembers,
    getMemberById,
    updateMemberRole,
    removeMember,
    createInvitation,
    getInvitations,
    cancelInvitation
};
