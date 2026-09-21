const prisma = require('../../lib/prisma');
const { successResponse } = require('../../lib/response');

const updateSettings = async (req, res, next) => {
    try {
        const { timezone, currency, fiscalYearStart, logoUrl } = req.body;
        const organizationId = req.organizationId; // Attached by your auth middleware

        const updatedOrg = await prisma.organization.update({
            where: { id: organizationId },
            data: {
                timezone,
                currency,
                fiscalYearStart,
                logoUrl
            }
        });

        return successResponse(res, 200, 'Organization settings updated', {
            timezone: updatedOrg.timezone,
            currency: updatedOrg.currency,
            fiscalYearStart: updatedOrg.fiscalYearStart,
            logoUrl: updatedOrg.logoUrl
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    updateSettings
};