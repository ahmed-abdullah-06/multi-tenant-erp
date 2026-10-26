const { requirePermission } = require('../../server/src/middleware/rbacMiddleware');
const prisma = require('../../server/src/lib/prisma');

jest.mock('../../server/src/lib/prisma', () => ({
    rolePermission: { findFirst: jest.fn() }
}));

describe('RBAC Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = { membership: { roleId: 'role-123' } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should block access if membership or roleId is missing', async () => {
        req.membership = null;
        const middleware = requirePermission('inventory:write');
        
        await middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'No active role found' });
    });

    it('should block access if permission is not found in database', async () => {
        prisma.rolePermission.findFirst.mockResolvedValue(null);
        const middleware = requirePermission('inventory:write');
        
        await middleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: requires 'inventory:write' permission" });
    });

    it('should allow immediate access if membership role is Owner', async () => {
        req.membership = { roleId: 'role-owner', role: { name: 'Owner' } };
        const middleware = requirePermission('reports:read');

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(prisma.rolePermission.findFirst).not.toHaveBeenCalled();
    });

    it('should allow immediate access if membership role is Admin', async () => {
        req.membership = { roleId: 'role-admin', role: { name: 'Admin' } };
        const middleware = requirePermission('billing:write');

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(prisma.rolePermission.findFirst).not.toHaveBeenCalled();
    });

    it('should allow access if role has wildcard (*) permission', async () => {
        prisma.rolePermission.findFirst.mockResolvedValue({ roleId: 'role-123', permissionId: 'perm-star' });
        const middleware = requirePermission('custom:action');

        await middleware(req, res, next);

        expect(prisma.rolePermission.findFirst).toHaveBeenCalledWith({
            where: {
                roleId: 'role-123',
                permission: {
                    action: { in: ['custom:action', 'action:custom', '*'] }
                }
            }
        });
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('should pass error to next(error) if database throws', async () => {
        const dbError = new Error('Database connection failed');
        prisma.rolePermission.findFirst.mockRejectedValue(dbError);
        const middleware = requirePermission('inventory:write');

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(dbError);
    });
});