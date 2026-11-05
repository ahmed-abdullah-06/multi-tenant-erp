const request = require('supertest');
const app = require('../../server/src/app');
const prisma = require('../../server/src/lib/prisma');
const crypto = require('crypto');

describe('E2E: Email Verification Full Flow', () => {
  const email = `e2e-verify-${Date.now()}@example.com`;
  let token;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } }).catch(() => {});
  });

  test('Step 1: Register creates user with unverified email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Verify Flow',
      email,
      password: 'password123'
    });
    expect(res.status).toBe(201);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeTruthy();
    expect(user.emailVerified).toBe(false);
    expect(user.emailVerificationToken).toBeTruthy();
    expect(user.emailVerificationExpires).toBeTruthy();
  });

  test('Step 2: Login works before verification (soft gate)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'password123'
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  test('Step 3: Resend issues a fresh token', async () => {
    const before = await prisma.user.findUnique({ where: { email } });
    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email });
    expect(res.status).toBe(200);

    const after = await prisma.user.findUnique({ where: { email } });
    expect(after.emailVerificationToken).not.toBe(before.emailVerificationToken);
  });

  test('Step 4: Wrong token is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'a'.repeat(64) });
    expect(res.status).toBe(400);
  });

  test('Step 5: Correct token verifies the email', async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    // Reverse the sha256: we cannot, so instead craft a token and hash it directly
    const plainToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hash,
        emailVerificationExpires: new Date(Date.now() + 3600_000)
      }
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: plainToken });
    expect(res.status).toBe(200);

    const verified = await prisma.user.findUnique({ where: { email } });
    expect(verified.emailVerified).toBe(true);
    expect(verified.emailVerificationToken).toBeNull();
    expect(verified.emailVerificationExpires).toBeNull();
  });

  test('Step 6: Token cannot be reused', async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    const plainToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: null }
    });
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: plainToken });
    expect(res.status).toBe(400);
  });
});
