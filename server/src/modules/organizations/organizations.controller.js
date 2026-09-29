const organizationsService = require('./organizations.service');
const { successResponse } = require('../../lib/response');

const createOrganization = async (req, res, next) => {
    try {
        const result = await organizationsService.createOrganization(req.user.id, req.body);
        return successResponse(res, 201, 'Organization created successfully', result);
    } catch (error) {
        next(error);
    }
};

const getMyOrganizations = async (req, res, next) => {
    try {
        const orgs = await organizationsService.getMyOrganizations(req.user.id);
        return successResponse(res, 200, 'User organizations retrieved', orgs);
    } catch (error) {
        next(error);
    }
};

const getCurrentOrganization = async (req, res, next) => {
    try {
        const org = await organizationsService.getOrganizationById(req.tenantId);
        if (!org) return res.status(404).json({ error: 'Organization not found' });
        return successResponse(res, 200, 'Current organization retrieved', org);
    } catch (error) {
        next(error);
    }
};

const updateCurrentOrganization = async (req, res, next) => {
    try {
        const updateData = {};
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.currency !== undefined) updateData.currency = req.body.currency;
        if (req.body.timezone !== undefined) updateData.timezone = req.body.timezone;
        if (req.body.logoUrl !== undefined) updateData.logoUrl = req.body.logoUrl;

        const org = await organizationsService.updateOrganization(req.tenantId, updateData);
        return successResponse(res, 200, 'Organization updated successfully', org);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrganization,
    getMyOrganizations,
    getCurrentOrganization,
    updateCurrentOrganization
};
