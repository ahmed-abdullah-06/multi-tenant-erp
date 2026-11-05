const authService = require('../../server/src/modules/auth/auth.service');

// Mock Prisma client
jest.mock('../../server/src/lib/prisma', () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn()
  },
  organization: {
    create: jest.fn(),
    findUnique: jest.fn()
  },
  role: {
    create: jest.fn(),
    findUnique: jest.fn()
  },
  permission: {
    upsert: jest.fn()
  },
  rolePermission: {
    create: jest.fn()
  },
  membership: {
    create: jest.fn(),
    findUnique: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn()
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  $transaction: jest.fn()
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn()
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn()
}));

// Mock email service
jest.mock('../../server/src/services/email.service', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendInvitationEmail: jest.fn(),
  sendVerificationEmail: jest.fn()
}));

const prisma = require('../../server/src/lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../../server/src/services/email.service');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('register', () => {
    test('should register a new user and create organization', async () => {
      const userData = { name: 'Test User', email: 'test@test.com', password: 'password123' };
      const mockUser = { id: 'user-id', ...userData, email: 'test@test.com' };
      const mockOrganization = { id: 'org-id', name: "Test User's Company", slug: 'test-user-org' };
      const mockRole = { id: 'role-id', name: 'Owner', organizationId: 'org-id' };
      const mockMembership = {
        id: 'membership-id',
        userId: 'user-id',
        organizationId: 'org-id',
        roleId: 'role-id',
        status: 'ACTIVE',
        organization: mockOrganization,
        role: mockRole
      };

      // Mock Prisma transaction
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          organization: { create: jest.fn().mockResolvedValue(mockOrganization) },
          role: { create: jest.fn().mockResolvedValue(mockRole) },
          permission: { upsert: jest.fn().mockResolvedValue({}) },
          rolePermission: { create: jest.fn().mockResolvedValue({}) },
          membership: { create: jest.fn().mockResolvedValue(mockMembership) },
          auditLog: { create: jest.fn().mockResolvedValue({}) }
        };
        return await callback(tx);
      });

      // Mock bcrypt
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashed-password');

      // Mock JWT
      jwt.sign.mockReturnValue('test-token');

      // Mock session
      prisma.session.create.mockResolvedValue({
        id: 'session-id',
        refreshToken: 'test-refresh-token'
      });

      // Mock role with permissions
      prisma.role.findUnique.mockResolvedValue({
        ...mockRole,
        permissions: [
          { permission: { action: 'read:inventory' } },
          { permission: { action: 'write:inventory' } }
        ]
      });

      const result = await authService.register(userData, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('token', 'test-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('organization');
      expect(result).toHaveProperty('membership');
      expect(result).toHaveProperty('access');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(jwt.sign).toHaveBeenCalled();
    });

    test('should throw error if email already registered', async () => {
      const userData = { name: 'Test User', email: 'existing@test.com', password: 'password123' };
      const existingUser = { id: 'existing-id', email: 'existing@test.com' };

      prisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(authService.register(userData, '127.0.0.1', 'test-agent')).rejects.toThrow(
        'Email already registered'
      );
    });
  });

  describe('login', () => {
    test('should login user with valid credentials', async () => {
      const credentials = { email: 'test@test.com', password: 'password123' };
      const mockUser = {
        id: 'user-id',
        name: 'Test User',
        email: 'test@test.com',
        passwordHash: 'hashed-password',
        status: 'ACTIVE',
        memberships: [
          {
            organizationId: 'org-id',
            organization: { id: 'org-id', name: 'Test Org', slug: 'test-org' },
            role: {
              id: 'role-id',
              name: 'Owner',
              permissions: [
                { permission: { action: 'read:inventory' } },
                { permission: { action: 'write:inventory' } }
              ]
            }
          }
        ]
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('test-token');

      prisma.session.create.mockResolvedValue({
        id: 'session-id',
        refreshToken: 'test-refresh-token'
      });

      const result = await authService.login(credentials, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('token', 'test-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('organizations');
      expect(result).toHaveProperty('defaultOrganizationId', 'org-id');
      expect(result).toHaveProperty('access');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(jwt.sign).toHaveBeenCalled();
    });

    test('should throw error for invalid credentials', async () => {
      const credentials = { email: 'test@test.com', password: 'wrongpassword' };
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        passwordHash: 'hashed-password',
        status: 'ACTIVE'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(credentials, '127.0.0.1', 'test-agent')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    test('should throw error for non-existent user', async () => {
      const credentials = { email: 'nonexistent@test.com', password: 'password123' };

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(credentials, '127.0.0.1', 'test-agent')).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('forgotPassword', () => {
    test('should send password reset email', async () => {
      const email = 'test@test.com';
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        name: 'Test User'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({});
      emailService.sendPasswordResetEmail.mockResolvedValue({});

      const result = await authService.forgotPassword(email, 'http://localhost:5000');

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email },
        data: expect.objectContaining({
          resetPasswordToken: expect.any(String),
          resetPasswordExpires: expect.any(Date)
        })
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    test('should silently succeed for non-existent email', async () => {
      const email = 'nonexistent@test.com';

      prisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.forgotPassword(email, 'http://localhost:5000');

      expect(result).toBe(true);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
