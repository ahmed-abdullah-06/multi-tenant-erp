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

    it('should call next() if permission is validated', async () => {
        prisma.rolePermission.findFirst.mockResolvedValue({ roleId: 'role-123', permissionId: 'perm-1' });
        const middleware = requirePermission('inventory:write');
        
        await middleware(req, res, next);
        
        expect(next).toHaveBeenCalledTimes(1);
    });
});