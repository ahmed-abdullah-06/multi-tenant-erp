const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const register = async ({ name, email, password }) => {
    const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });
    if (existing) {
        throw new Error('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and a default organization with Owner membership
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                passwordHash
            }
        });

        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
        const organization = await tx.organization.create({
            data: {
                name: `${name}'s Company`,
                slug
            }
        });

        // Ensure default admin role exists for this org
        const role = await tx.role.create({
            data: {
                name: 'Owner',
                description: 'Full administrative access',
                organizationId: organization.id,
                isSystem: true
            }
        });

        // Seed basic permissions and link to role
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
                userId: user.id,
                organizationId: organization.id,
                roleId: role.id,
                status: 'ACTIVE'
            },
            include: { organization: true, role: true }
        });

        // Create initial audit log
        await tx.auditLog.create({
            data: {
                organizationId: organization.id,
                userId: user.id,
                action: 'REGISTER',
                entityType: 'USER',
                entityId: user.id,
                details: { email: user.email, organizationId: organization.id }
            }
        });

        return { user, organization, membership };
    });

    const token = jwt.sign(
        { id: result.user.id, email: result.user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return {
        token,
        user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email
        },
        organization: result.organization,
        membership: result.membership
    };
};

const login = async ({ email, password }) => {
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
            memberships: {
                where: { status: 'ACTIVE' },
                include: { organization: true, role: true }
            }
        }
    });

    if (!user || user.status !== 'ACTIVE') {
        throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    // Pick active organization (first membership or null if none yet)
    const defaultOrg = user.memberships.length > 0 ? user.memberships[0].organization : null;

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        },
        organizations: user.memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role.name
        })),
        defaultOrganizationId: defaultOrg ? defaultOrg.id : null
    };
};

const getCurrentUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            memberships: {
                where: { status: 'ACTIVE' }, // Only pull active memberships
                include: {
                    organization: true,
                    role: {
                        include: { permissions: true }
                    }
                }
            }
        }
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Deliberate Decision: Handle stale activeOrgId
    if (user.activeOrgId) {
        const isValidActiveOrg = user.memberships.some(
            (m) => m.organizationId === user.activeOrgId && m.organization.status === 'ACTIVE'
        );
        
        if (!isValidActiveOrg) {
            // The org is stale. Auto-heal by falling back to the first available active org, or null.
            const fallbackOrgId = user.memberships.length > 0 
                ? user.memberships[0].organizationId 
                : null;

            // Persist the corrected state to the database
            await prisma.user.update({
                where: { id: userId },
                data: { activeOrgId: fallbackOrgId }
            });

            // Update the in-memory object before returning it to the controller
            user.activeOrgId = fallbackOrgId;
        }
    }

    // Exclude sensitive data before returning to the client
    const { passwordHash, ...safeUser } = user;
    return safeUser;
};

module.exports = {
    register,
    login,
    getCurrentUser
};
