const request = require('supertest');
const app = require('../../server/src/app');

// Regression test: these three endpoints crashed with 500 because controllers
// read `req.tenant.id` while tenantResolver only ever sets `req.tenantId`.
describe('Regression: tenant-scoped list endpoints (req.tenantId)', () => {
    let token;
    let orgId;
    const authHeader = () => ({
        Authorization: `Bearer ${token}`,
        'x-organization-id': orgId
    });

    beforeAll(async () => {
        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@demo.com', password: 'admin123' });
        expect(login.status).toBe(200);
        token = login.body.data.token;

        const orgs = await request(app)
            .get('/api/v1/organizations/my')
            .set('Authorization', `Bearer ${token}`);
        expect(orgs.status).toBe(200);
        orgId = orgs.body.data[0].id;
    });

    test('GET /api/v1/inventory returns 200 (not 500)', async () => {
        const res = await request(app).get('/api/v1/inventory').set(authHeader());
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/v1/inventory?search= returns 200', async () => {
        const res = await request(app)
            .get('/api/v1/inventory?search=a&limit=5')
            .set(authHeader());
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/v1/sales/orders returns 200 (not 500)', async () => {
        const res = await request(app).get('/api/v1/sales/orders').set(authHeader());
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/v1/sales/orders?search= returns 200', async () => {
        const res = await request(app)
            .get('/api/v1/sales/orders?search=a&limit=5')
            .set(authHeader());
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/v1/invitations returns 200 (Owner bypasses settings:read)', async () => {
        const res = await request(app).get('/api/v1/invitations').set(authHeader());
        expect(res.status).toBe(200);
    });

    test('GET /api/v1/sales/customers returns 200', async () => {
        const res = await request(app)
            .get('/api/v1/sales/customers?search=a&limit=5')
            .set(authHeader());
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});
