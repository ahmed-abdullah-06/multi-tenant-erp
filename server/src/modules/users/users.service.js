const prisma = require('../../lib/prisma');
const crypto = require('crypto');
const sendEmail = require('../../lib/email');

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getMembers = async (tenantId) => {
    return await prisma.membership.findMany({
        where: { organizationId: tenantId },
        include: {
            user: {
                select: { id: true, name: true, email: true, status: true, avatarUrl: true }
            },
            role: true
        }
    });
};

const getMemberById = async (tenantId, memberId) => {
    return await prisma.membership.findFirst({
        where: { id: memberId, organizationId: tenantId },
        include: {
            user: {
                select: { id: true, name: true, email: true, status: true, avatarUrl: true }
            },
            role: true
        }
    });
};

const updateMemberRole = async (tenantId, memberId, roleId) => {
    // Validate role belongs to this org or is system role
    const role = await prisma.role.findFirst({
        where: {
            id: roleId,
            OR: [{ organizationId: tenantId }, { organizationId: null }]
        }
    });
    if (!role) throw new Error('Role not found or invalid');

    const result = await prisma.membership.updateMany({
        where: { id: memberId, organizationId: tenantId },
        data: { roleId }
    });
    if (result.count === 0) throw new Error('Member not found or access denied');
    return result;
};

const removeMember = async (tenantId, memberId) => {
    const result = await prisma.membership.deleteMany({
        where: { id: memberId, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error('Member not found or access denied');
    return result;
};

const createInvitation = async (tenantId, invitedById, { email, roleId }) => {
    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });

    if (existingUser) {
        const existingMembership = await prisma.membership.findUnique({
            where: {
                userId_organizationId: {
                    userId: existingUser.id,
                    organizationId: tenantId
                }
            }
        });
        if (existingMembership) {
            throw new Error('User is already a member of this organization');
        }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
        data: {
            email: email.toLowerCase(),
            organizationId: tenantId,
            roleId,
            invitedById,
            token,
            expiresAt
        },
        include: {
            role: true,
            organization: { select: { name: true } },
            invitedBy: { select: { name: true, email: true } }
        }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const invitationUrl = `${frontendUrl}/login.html?invitationToken=${encodeURIComponent(token)}`;
    const organizationName = invitation.organization.name;
    const inviterName = invitation.invitedBy.name || invitation.invitedBy.email;
    const roleName = invitation.role?.name || 'member';

    await sendEmail({
        email: invitation.email,
        subject: `You're invited to join ${organizationName}`,
        message: [
            `${inviterName} invited you to join ${organizationName} as a ${roleName}.`,
            '',
            `Sign in to accept the invitation: ${invitationUrl}`,
            '',
            'This invitation expires in 7 days.'
        ].join('\n'),
        html: `
            <p>${escapeHtml(inviterName)} invited you to join <strong>${escapeHtml(organizationName)}</strong> as a ${escapeHtml(roleName)}.</p>
            <p><a href="${escapeHtml(invitationUrl)}">Sign in to accept the invitation</a></p>
            <p>This invitation expires in 7 days.</p>
        `
    });

    return invitation;
};

const getInvitations = async (tenantId) => {
    return await prisma.invitation.findMany({
        where: { organizationId: tenantId },
        include: { role: true, invitedBy: { select: { id: true, name: true, email: true } } }
    });
};

const cancelInvitation = async (tenantId, invitationId) => {
    const result = await prisma.invitation.deleteMany({
        where: { id: invitationId, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error('Invitation not found or access denied');
    return result;
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
