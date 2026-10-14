const prisma = require('../../lib/prisma');
const crypto = require('crypto');

const sendInvite = async (organizationId, inviterId, email, role) => {
    // Check if the user is already a member
    const existingMember = await prisma.userOrganization.findFirst({
        where: { 
            organizationId, 
            user: { email } 
        }
    });
    
    if (existingMember) {
        throw new Error('User is already a member of this organization');
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration

    // Create the invitation record
    const invitation = await prisma.invitation.create({
        data: {
            email,
            role,
            token,
            expiresAt,
            organizationId,
            inviterId
        }
    });

    // Note: In a production environment, you would integrate an email service 
    // (like SendGrid or AWS SES) right here to email the token/link to the user.
    
    return invitation;
};

const acceptInvite = async (userId, token) => {
    // Use an atomic transaction to ensure the invite is consumed safely
    return await prisma.$transaction(async (tx) => {
        const invitation = await tx.invitation.findUnique({
            where: { token }
        });

        if (!invitation) throw new Error('Invalid invitation token');
        if (invitation.expiresAt < new Date()) throw new Error('Invitation has expired');

        // Check if user is somehow already in the org to prevent duplicates
        const existing = await tx.userOrganization.findFirst({
            where: { userId, organizationId: invitation.organizationId }
        });

        if (!existing) {
            await tx.userOrganization.create({
                data: {
                    userId,
                    organizationId: invitation.organizationId,
                    role: invitation.role
                }
            });
        }

        // Delete the invitation so it cannot be used again
        await tx.invitation.delete({
            where: { id: invitation.id }
        });

        return { organizationId: invitation.organizationId };
    });
};

const listInvitations = async (organizationId) => {
    return await prisma.invitation.findMany({
        where: { organizationId },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
    });
};

const revokeInvitation = async (organizationId, inviteId) => {
    return await prisma.invitation.deleteMany({
        where: { id: inviteId, organizationId }
    });
};

module.exports = { sendInvite, acceptInvite, listInvitations, revokeInvitation };