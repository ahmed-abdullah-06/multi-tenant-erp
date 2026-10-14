const invitationService = require('./invitation.service');

const sendInvite = async (req, res) => {
    try {
        const { email, role } = req.body;
        const organizationId = req.tenant.id; 
        const inviterId = req.user.id;

        const invitation = await invitationService.sendInvite(organizationId, inviterId, email, role);
        
        res.status(201).json({ 
            data: invitation, 
            message: 'Invitation generated successfully.' 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const acceptInvite = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        const result = await invitationService.acceptInvite(userId, token);
        
        res.status(200).json({ 
            data: result, 
            message: 'Organization joined successfully.' 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const listInvitations = async (req, res) => {
    try {
        const organizationId = req.tenant.id;
        const invitations = await invitationService.listInvitations(organizationId);
        
        res.status(200).json({ data: invitations });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch invitations' });
    }
};

const revokeInvitation = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.tenant.id;

        await invitationService.revokeInvitation(organizationId, id);
        
        res.status(200).json({ message: 'Invitation revoked.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to revoke invitation' });
    }
};

module.exports = { sendInvite, acceptInvite, listInvitations, revokeInvitation };