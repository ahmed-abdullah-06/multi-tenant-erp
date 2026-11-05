const http = require('http');
const request = require('supertest');
const app = require('../../server/src/app');
const prisma = require('../../server/src/lib/prisma');

// E2E: a webhook endpoint receives a signed delivery when a sales order is created.
// Guards the full path: business event -> sendWebhookEvent -> HTTP POST -> WebhookDelivery record.
describe('E2E: Webhook delivery on business events', () => {
    let server;
    let receiverPort;
    let received = [];
    let token;
    let orgId;
    let endpointId;
    let customerId;
    let productId;

    const authHeader = () => ({
        Authorization: `Bearer ${token}`,
        'x-organization-id': orgId
    });

    beforeAll(async () => {
        // Local webhook receiver
        server = http.createServer((req, res) => {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
                received.push({
                    method: req.method,
                    url: req.url,
                    signature: req.headers['x-webhook-signature'],
                    event: req.headers['x-webhook-event'],
                    body
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end('{"ok":true}');
            });
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        receiverPort = server.address().port;

        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@demo.com', password: 'admin123' });
        expect(login.status).toBe(200);
        token = login.body.data.token;

        const orgs = await request(app)
            .get('/api/v1/organizations/my')
            .set('Authorization', `Bearer ${token}`);
        orgId = orgs.body.data[0].id;
    });

    afterAll(async () => {
        // Best-effort cleanup of test data
        try {
            if (endpointId) await prisma.webhookEndpoint.deleteMany({ where: { id: endpointId } });
            if (customerId) {
                await prisma.salesOrderItem.deleteMany({
                    where: { salesOrder: { customerId } }
                });
                await prisma.salesOrder.deleteMany({ where: { customerId } });
                await prisma.customer.deleteMany({ where: { id: customerId } });
            }
        } catch (e) { /* ignore cleanup errors */ }
        if (server) await new Promise((resolve) => server.close(resolve));
    });

    test('creates a webhook endpoint subscribed to order.created', async () => {
        const res = await request(app)
            .post('/api/v1/webhooks')
            .set(authHeader())
            .send({
                url: `http://127.0.0.1:${receiverPort}/hook`,
                events: ['order.created'],
                description: 'e2e receiver'
            });
        expect(res.status).toBe(201);
        endpointId = res.body.data.id;
        expect(endpointId).toBeTruthy();
    });

    test('creating a sales order delivers a signed webhook', async () => {
        // Fixture: customer + product
        const cust = await request(app)
            .post('/api/v1/sales/customers')
            .set(authHeader())
            .send({ name: `Webhook Test Cust ${Date.now()}`, email: `wh-${Date.now()}@example.com` });
        expect(cust.status).toBe(201);
        customerId = cust.body.data.id;

        const products = await request(app).get('/api/v1/inventory').set(authHeader());
        productId = products.body.data[0].id;

        const order = await request(app)
            .post('/api/v1/sales/orders')
            .set(authHeader())
            .send({
                customerId,
                items: [{ productId, quantity: 1, unitPrice: 10 }]
            });
        expect(order.status).toBe(201);

        // The dispatch is fire-and-forget — poll for delivery record (max ~5s)
        let delivery = null;
        for (let i = 0; i < 50 && !delivery; i++) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            delivery = await prisma.webhookDelivery.findFirst({
                where: { webhookEndpointId: endpointId, event: 'order.created' },
                orderBy: { createdAt: 'desc' }
            });
        }

        expect(delivery).toBeTruthy();
        expect(delivery.success).toBe(true);
        expect(delivery.statusCode).toBe(200);
        expect(received.length).toBeGreaterThanOrEqual(1);

        const hook = received[0];
        expect(hook.method).toBe('POST');
        expect(hook.event).toBe('order.created');
        // HMAC-SHA256 signature header must be present
        expect(hook.signature).toMatch(/^[0-9a-f]{64}$/);

        const payload = JSON.parse(hook.body);
        expect(payload.event).toBe('order.created');
        expect(payload.organizationId).toBe(orgId);
        expect(payload.data).toHaveProperty('orderNumber');
    });

    test('endpoints not subscribed to the event do not receive it', async () => {
        const otherEndpoint = await request(app)
            .post('/api/v1/webhooks')
            .set(authHeader())
            .send({
                url: `http://127.0.0.1:${receiverPort}/other`,
                events: ['invoice.paid'],
                description: 'not subscribed to order.created'
            });
        expect(otherEndpoint.status).toBe(201);

        const before = received.length;

        await request(app)
            .post('/api/v1/sales/orders')
            .set(authHeader())
            .send({ customerId, items: [{ productId, quantity: 1, unitPrice: 10 }] });

        // Wait long enough for a (wrong) delivery to arrive
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const wrongDeliveries = await prisma.webhookDelivery.findMany({
            where: { webhookEndpointId: otherEndpoint.body.data.id }
        });
        expect(wrongDeliveries).toHaveLength(0);

        // Only the order.created endpoint received the new event.
        // (Other suites may run in parallel and create orders, so allow >= 1.)
        expect(received.length).toBeGreaterThanOrEqual(before + 1);
        expect(received[received.length - 1].event).toBe('order.created');

        await prisma.webhookEndpoint.deleteMany({ where: { id: otherEndpoint.body.data.id } });
    });
});
