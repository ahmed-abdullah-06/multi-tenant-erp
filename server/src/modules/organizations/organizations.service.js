const prisma = require('../../lib/prisma');

const createOrganization = async (userId, { name }) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

    return await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
            data: {
                name,
                slug,
                status: 'ACTIVE'
            }
        });

        const role = await tx.role.create({
            data: {
                name: 'Owner',
                description: 'Full administrative access',
                organizationId: organization.id,
                isSystem: true
            }
        });

        const permissions = [
            'users:read', 'users:write',
            'organizations:read', 'organizations:write',
            'rbac:read', 'rbac:write',
            'employees:read', 'employees:write',
            'inventory:read', 'inventory:write',
            'purchasing:read', 'purchasing:write',
            'sales:read', 'sales:write',
            'expenses:read', 'expenses:write',
            'reports:read',
            'notifications:read', 'notifications:write',
            'audit:read',
            'billing:read', 'billing:write'
        ];

        for (const action of permissions) {
            const module = action.split(':')[0];
            const perm = await tx.permission.upsert({
                where: { action },
                update: {},
                create: { action, module, description: `Permission for ${action}` }
            });

            await tx.rolePermission.create({
                data: {
                    roleId: role.id,
                    permissionId: perm.id
                }
            });
        }

        const membership = await tx.membership.create({
            data: {
                userId,
                organizationId: organization.id,
                roleId: role.id,
                status: 'ACTIVE'
            },
            include: { role: true }
        });

        await tx.auditLog.create({
            data: {
                organizationId: organization.id,
                userId,
                action: 'CREATE',
                entityType: 'ORGANIZATION',
                entityId: organization.id,
                details: { name: organization.name, slug: organization.slug }
            }
        });

        return { organization, membership };
    });
};

const getMyOrganizations = async (userId) => {
    const memberships = await prisma.membership.findMany({
        where: {
            userId,
            status: 'ACTIVE',
            organization: { status: 'ACTIVE' }
        },
        include: {
            organization: true,
            role: true
        }
    });

    return memberships.map(m => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role.name,
        status: m.organization.status,
        createdAt: m.organization.createdAt
    }));
};

const getOrganizationById = async (tenantId) => {
    return await prisma.organization.findUnique({
        where: { id: tenantId },
        include: {
            subscription: {
                include: { plan: true }
            }
        }
    });
};

const updateOrganization = async (tenantId, updateData) => {
    const org = await prisma.organization.update({
        where: { id: tenantId },
        data: updateData
    });
    return org;
};

module.exports = {
    createOrganization,
    getMyOrganizations,
    getOrganizationById,
    updateOrganization
};
