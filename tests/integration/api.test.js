const request = require('supertest');
const app = require('../../server/src/app');

describe('API Health Check', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});

describe('Authentication Endpoints', () => {
  test('POST /api/v1/auth/register should return 400 for missing data', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({}); // Empty body
    expect(response.status).toBe(400);
  });

  test('POST /api/v1/auth/login should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com' }); // Missing password
    expect(response.status).toBe(400);
  });

  test('POST /api/v1/auth/login should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'invalid@test.com', password: 'wrongpassword' });
    expect(response.status).toBe(401);
  });
});

describe('Protected Routes', () => {
  test('GET /api/v1/auth/me should return 401 without token', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
  });

  test('GET /api/v1/organizations should return 401 without token', async () => {
    const response = await request(app).get('/api/v1/organizations');
    expect(response.status).toBe(401);
  });
});

describe('Inventory Endpoints (Unauthenticated)', () => {
  test('GET /api/v1/inventory should return 401 without token', async () => {
    const response = await request(app).get('/api/v1/inventory');
    expect(response.status).toBe(401);
  });
});

describe('Input Validation', () => {
  test('POST /api/v1/auth/register should validate email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      });
    expect(response.status).toBe(400);
  });

  test('POST /api/v1/auth/register should validate password length', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: 'test@test.com',
        password: 'short' // Less than 8 characters
      });
    expect(response.status).toBe(400);
  });
});

describe('API Documentation', () => {
  test('GET /api-docs should be accessible', async () => {
    const response = await request(app).get('/api-docs');
    // Swagger UI may redirect to /api-docs/
    expect([200, 301]).toContain(response.status);
  });
});
