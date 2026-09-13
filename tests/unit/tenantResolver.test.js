const { resolveTenant } = require('../../server/src/middleware/tenantResolver');
const prisma = require('../../server/src/lib/prisma');

// Mock the Prisma client
jest.mock('../../server/src/lib/prisma', () => ({
    membership: {
        findUnique: jest.fn()
    }
}));

describe('Tenant Resolver Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { id: 'user-123' },
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should return 401 if user is not authenticated', async () => {
        req.user = null;
        
        await resolveTenant(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });

    it('should return 400 if x-organization-id header is missing', async () => {
        await resolveTenant(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Missing x-organization-id header' });
    });

    it('should return 403 if user is not a member of the organization', async () => {
        req.headers['x-organization-id'] = 'org-456';
        prisma.membership.findUnique.mockResolvedValue(null);
        
        await resolveTenant(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access denied to this organization' });
    });

    it('should attach tenantId and call next() if membership is valid', async () => {
        req.headers['x-organization-id'] = 'org-456';
        
        const mockMembership = {
            organizationId: 'org-456',
            status: 'ACTIVE',
            organization: { status: 'ACTIVE' }
        };
        
        prisma.membership.findUnique.mockResolvedValue(mockMembership);
        
        await resolveTenant(req, res, next);
        
        expect(req.tenantId).toBe('org-456');
        expect(req.membership).toEqual(mockMembership);
        expect(next).toHaveBeenCalledTimes(1);
    });
});