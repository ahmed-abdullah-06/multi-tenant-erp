const request = require('supertest');
const app = require('../../server/src/app');

describe('Email Verification Endpoints', () => {
  test('POST /api/v1/auth/verify-email with missing token returns 400', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/v1/auth/verify-email with bogus token returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'deadbeef'.repeat(8) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  test('POST /api/v1/auth/resend-verification returns 200 even for unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
  });

  test('Register response still contains token and user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Verify Test',
      email: `verify-${Date.now()}@example.com`,
      password: 'password123'
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('email');
  });
});
