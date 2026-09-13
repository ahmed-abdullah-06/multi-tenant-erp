const request = require('supertest');
const app = require('../../server/src/app');
const prisma = require('../../server/src/lib/prisma');

describe('E2E: Core ERP Business Workflow', () => {
    let token;
    let tenantId;
    let productId;
    let supplierId;
    let purchaseOrderId;
    let customerId;
    let salesOrderId;

    // Clean up the database before running the E2E suite
    beforeAll(async () => {
        await prisma.organization.deleteMany({ where: { slug: 'e2e-test-org' } });
        await prisma.user.deleteMany({ where: { email: 'e2e@test.com' } });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('Step 1: Should register a new user and organization', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                name: 'E2E Tester',
                email: 'e2e@test.com',
                password: 'password123'
            });

        expect(res.status).toBe(201);
        expect(res.body.data).toHaveProperty('token');
        
        token = res.body.data.token;
        tenantId = res.body.data.organization.id;
        
        // Update slug to ensure cleanup works next time
        await prisma.organization.update({
            where: { id: tenantId },
            data: { slug: 'e2e-test-org' }
        });
    });

    it('Step 2: Should create a product in inventory', async () => {
        const res = await request(app)
            .post('/api/v1/inventory')
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId)
            .send({
                name: 'E2E Test Widget',
                price: 100.00,
                stock: 0
            });

        expect(res.status).toBe(201);
        productId = res.body.data.id;
    });

    it('Step 3: Should create a supplier and purchase order', async () => {
        // Create Supplier
        const supRes = await request(app)
            .post('/api/v1/purchasing/suppliers')
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId)
            .send({ name: 'E2E Supplier' });
        
        supplierId = supRes.body.data.id;

        // Create PO
        const poRes = await request(app)
            .post('/api/v1/purchasing/orders')
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId)
            .send({
                supplierId,
                items: [{ productId, quantity: 50, unitPrice: 40.00 }]
            });

        expect(poRes.status).toBe(201);
        purchaseOrderId = poRes.body.data.id;
    });

    it('Step 4: Should receive PO and increase stock', async () => {
        const res = await request(app)
            .post(`/api/v1/purchasing/orders/${purchaseOrderId}/receive`)
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId)
            .send({});

        expect(res.status).toBe(200);

        // Verify stock increased
        const prodRes = await request(app)
            .get(`/api/v1/inventory/${productId}`)
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId);
        
        expect(prodRes.body.data.stock).toBe(50);
    });

    it('Step 5: Should create customer and fulfill sales order', async () => {
        // Create Customer
        const custRes = await request(app)
            .post('/api/v1/sales/customers')
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId)
            .send({ name: 'E2E Customer' });
        
        customerId = custRes.body.data.id;

        // Create SO
        const soRes = await request(app)
            .post('/api/v1/sales/orders')
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId)
            .send({
                customerId,
                items: [{ productId, quantity: 10, unitPrice: 100.00 }]
            });

        salesOrderId = soRes.body.data.id;

        // Fulfill SO
        const fulfillRes = await request(app)
            .post(`/api/v1/sales/orders/${salesOrderId}/fulfill`)
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId)
            .send({});

        expect(fulfillRes.status).toBe(200);
    });

    it('Step 6: Should reflect accurate data in reports', async () => {
        const res = await request(app)
            .get('/api/v1/reports/dashboard')
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', tenantId);

        expect(res.status).toBe(200);
        expect(res.body.data.sales.totalOrders).toBe(1);
        // Stock started at 0, bought 50, sold 10 = 40 remaining
        expect(res.body.data.products.total).toBe(1);
    });
});