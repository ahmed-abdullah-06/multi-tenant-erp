const prisma = require('../../lib/prisma');

const getRoles = async (tenantId) => {
    return await prisma.role.findMany({
        where: {
            OR: [
                { organizationId: tenantId },
                { organizationId: null }
            ]
        },
        include: {
            permissions: {
                include: { permission: true }
            },
            _count: {
                select: { memberships: true }
            }
        }
    });
};

const getRoleById = async (tenantId, roleId) => {
    return await prisma.role.findFirst({
        where: {
            id: roleId,
            OR: [
                { organizationId: tenantId },
                { organizationId: null }
            ]
        },
        include: {
            permissions: {
                include: { permission: true }
            }
        }
    });
};

const createRole = async (tenantId, { name, description, permissionIds }) => {
    return await prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
            data: {
                name,
                description,
                organizationId: tenantId,
                isSystem: false
            }
        });

        if (Array.isArray(permissionIds) && permissionIds.length > 0) {
            for (const permissionId of permissionIds) {
                await tx.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId
                    }
                });
            }
        }

        return role;
    });
};

const updateRole = async (tenantId, roleId, { name, description, permissionIds }) => {
    // Ensure custom role and belongs to tenant
    const existing = await prisma.role.findFirst({
        where: { id: roleId, organizationId: tenantId, isSystem: false }
    });
    if (!existing) throw new Error('Role not found or system roles cannot be modified');

    return await prisma.$transaction(async (tx) => {
        await tx.role.update({
            where: { id: roleId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description })
            }
        });

        if (Array.isArray(permissionIds)) {
            await tx.rolePermission.deleteMany({
                where: { roleId }
            });
            for (const permId of permissionIds) {
                await tx.rolePermission.create({
                    data: {
                        roleId,
                        permissionId: permId
                    }
                });
            }
        }

        return await tx.role.findUnique({
            where: { id: roleId },
            include: { permissions: { include: { permission: true } } }
        });
    });
};

const deleteRole = async (tenantId, roleId) => {
    const role = await prisma.role.findFirst({
        where: { id: roleId, organizationId: tenantId, isSystem: false },
        include: { _count: { select: { memberships: true } } }
    });
    if (!role) throw new Error('Role not found or system roles cannot be deleted');
    if (role._count.memberships > 0) {
        throw new Error('Cannot delete role currently assigned to active members');
    }

    const result = await prisma.role.deleteMany({
        where: { id: roleId, organizationId: tenantId }
    });
    return result;
};

const getPermissions = async () => {
    return await prisma.permission.findMany({
        orderBy: { module: 'asc' }
    });
};

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getPermissions
};
