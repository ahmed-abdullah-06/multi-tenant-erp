const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../lib/prisma'); // Adjust path to your prisma client
const sendEmail = require('../../lib/email')

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRES_IN = process.env.NODE_ENV === 'production' ? '15m' : '7d'; // Longer for dev
const REFRESH_TOKEN_DAYS = 7; 

// --- Helper: Token Generation & Session Storage ---
const generateSession = async (userId, ipAddress, userAgent) => {
    const accessToken = jwt.sign(
        { id: userId },
        JWT_SECRET,
        { expiresIn: JWT_ACCESS_EXPIRES_IN }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
        data: {
            userId,
            refreshToken,
            expiresAt,
            ipAddress,
            userAgent
        }
    });

    return { accessToken, refreshToken, session };
};

const register = async ({ name, email, password }, ipAddress, userAgent) => {
    const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });
    if (existing) {
        throw new Error('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

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
                userId: user.id,
                organizationId: organization.id,
                roleId: role.id,
                status: 'ACTIVE'
            },
            include: { organization: true, role: true }
        });

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

    const { accessToken, refreshToken } = await generateSession(result.user.id, ipAddress, userAgent);

    return {
        accessToken,
        refreshToken,
        user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email
        },
        organization: result.organization,
        membership: result.membership
    };
};

const login = async ({ email, password }, ipAddress, userAgent) => {
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

    const { accessToken, refreshToken } = await generateSession(user.id, ipAddress, userAgent);
    const defaultOrg = user.memberships.length > 0 ? user.memberships[0].organization : null;

    return {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email },
        organizations: user.memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role.name
        })),
        defaultOrganizationId: defaultOrg ? defaultOrg.id : null
    };
};

const refreshSession = async (oldRefreshToken, ipAddress, userAgent) => {
    const session = await prisma.session.findUnique({
        where: { refreshToken: oldRefreshToken },
        include: { user: true }
    });

    if (!session) {
        throw new Error('Invalid refresh token');
    }

    if (session.isRevoked) {
        await prisma.session.updateMany({
            where: { userId: session.userId },
            data: { isRevoked: true }
        });
        throw new Error('Security alert: Token reuse detected. All sessions revoked.');
    }

    if (new Date() > session.expiresAt) {
        await prisma.session.update({
            where: { id: session.id },
            data: { isRevoked: true }
        });
        throw new Error('Refresh token expired. Please log in again.');
    }

    await prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true }
    });

    return await generateSession(session.userId, ipAddress, userAgent);
};

const logout = async (userId, refreshToken) => {
    if (refreshToken) {
        await prisma.session.updateMany({
            where: { refreshToken, userId },
            data: { isRevoked: true }
        });
    } else {
        await prisma.session.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true }
        });
    }
    return true;
};

const getCurrentUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            memberships: {
                where: { status: 'ACTIVE' },
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

    if (user.activeOrgId) {
        const isValidActiveOrg = user.memberships.some(
            (m) => m.organizationId === user.activeOrgId && m.organization.status === 'ACTIVE'
        );
        
        if (!isValidActiveOrg) {
            const fallbackOrgId = user.memberships.length > 0 
                ? user.memberships[0].organizationId 
                : null;

            await prisma.user.update({
                where: { id: userId },
                data: { activeOrgId: fallbackOrgId }
            });

            user.activeOrgId = fallbackOrgId;
        }
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
};

const forgotPassword = async (email, originUrl) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Return silently to prevent email enumeration attacks
        return true; 
    }

    // 1. Generate a raw random token for the email link
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash the token for secure database storage
    const passwordResetHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // 3. Set expiration to 15 minutes from now
    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
        where: { email },
        data: {
            resetPasswordToken: passwordResetHash,
            resetPasswordExpires
        }
    });

    // 4. Send the email with the unhashed token
    const resetUrl = `${originUrl}/reset-password.html?token=${resetToken}`;
    const message = `You requested a password reset. Please click the following link to set a new password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        message
    });

    return true;
};

const resetPassword = async (token, newPassword) => {
    // 1. Hash the incoming token to compare with the database
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // 2. Find a user with this token where the expiration is strictly in the future
    const user = await prisma.user.findFirst({
        where: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { gt: new Date() }
        }
    });

    if (!user) {
        throw new Error('Token is invalid or has expired');
    }

    // 3. Hash the new password and clear the reset fields
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpires: null
        }
    });

    return true;
};

module.exports = {
    register,
    login,
    refreshSession,
    logout,
    getCurrentUser,
    forgotPassword,
    resetPassword
};