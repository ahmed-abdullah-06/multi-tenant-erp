const prisma = require('../../lib/prisma');
const crypto = require('crypto');

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
        include: { role: true }
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
