const ledgerService = require('./ledger.service');
const { successResponse } = require('../../lib/response');

const getTrialBalance = async (req, res, next) => {
    try {
        const organizationId = req.tenantId; // from resolveTenant middleware
        
        const report = await ledgerService.getTrialBalance(organizationId);
        
        return successResponse(res, 200, 'Trial balance retrieved successfully', report);
    } catch (error) {
        next(error);
    }
};

const getJournalEntries = async (req, res, next) => {
    try {
        const organizationId = req.tenantId;
        const limit = req.query.limit || 50;

        const entries = await ledgerService.getJournalEntries(organizationId, limit);
        
        return successResponse(res, 200, 'Journal entries retrieved successfully', entries);
    } catch (error) {
        next(error);
    }
};

const createManualEntry = async (req, res, next) => {
    try {
        const organizationId = req.tenantId;
        const { description, reference, lines } = req.body;

        // Lines should be an array of { accountId, debit, credit }
        if (!lines || lines.length < 2) {
            return res.status(400).json({ error: 'A journal entry must have at least two lines.' });
        }

        const entry = await ledgerService.recordTransaction(organizationId, description, lines, reference);
        
        return successResponse(res, 201, 'Manual journal entry recorded successfully', entry);
    } catch (error) {
        if (error.message.includes('unbalanced')) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

module.exports = {
    getTrialBalance,
    getJournalEntries,
    createManualEntry
};