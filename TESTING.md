# Testing Guide

## Overview

This project uses Jest for testing with three levels of tests:
- **Unit tests**: Test individual functions and services in isolation
- **Integration tests**: Test API endpoints and middleware
- **E2E tests**: Test complete business workflows

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests  
npm run test:integration

# Run specific test file
npm test -- tests/unit/auth.service.test.js
```

## Test Database Setup

### Local Development

The tests use the same database as development by default. Before running tests:

1. **Apply migrations**:
   ```bash
   npx prisma migrate deploy
   ```

2. **Seed the database**:
   ```bash
   npm run seed
   ```
   
   This creates:
   - Admin user: `admin@demo.com` / `admin123`
   - Demo organization with sample data
   - Required permissions and roles

### CI/CD (GitHub Actions)

The CI pipeline uses a dedicated PostgreSQL test database:
- Fresh database created for each test run
- Automatically seeded before tests
- No conflicts with production data
- See `.github/workflows/test.yml` for configuration

## Test Database Considerations

**Important**: When running tests locally, they use your development database. Some tests may:
- Create temporary test data
- Clean up after themselves
- But NOT delete seeded admin user and demo organization

**Best Practice for Local Testing**:
1. Use a separate test database (recommended)
2. Or ensure your development database is properly seeded before running tests
3. Never run tests against production database

### Using a Separate Test Database

Create `.env.test`:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/erp_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-not-for-production
NODE_ENV=test
```

Then run migrations and seed for test database:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/erp_test npx prisma migrate deploy
DATABASE_URL=postgresql://postgres:password@localhost:5432/erp_test npm run seed
```

## Test Structure

```
tests/
├── unit/                    # Unit tests for services and utilities
│   ├── auth.service.test.js
│   ├── inventory.service.test.js
│   └── ...
├── integration/             # API endpoint tests
│   ├── api.test.js
│   ├── health.test.js
│   └── ...
├── e2e/                     # End-to-end workflow tests
│   ├── core-workflow.test.js
│   ├── webhook-delivery.test.js
│   └── ...
├── globalSetup.js           # Runs once before all tests (seeds database)
└── jest.setup.js            # Runs after each test file (cleanup)
```

## Common Issues

### Tests failing with 401 errors

**Cause**: Database not seeded with admin user.

**Solution**:
```bash
npm run seed
```

### Tests failing with "Permission unique constraint" error

**Cause**: Old permission format in database.

**Solution**:
```bash
node scripts/fix-permissions.js
npm run seed
```

### Tests timing out

**Cause**: Redis or PostgreSQL not running.

**Solution**:
```bash
# Start Redis
redis-server

# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"
```

## Writing New Tests

### Unit Test Example

```javascript
const { myService } = require('../../server/src/services/myService');

describe('My Service', () => {
    test('should do something', () => {
        const result = myService.doSomething();
        expect(result).toBe(expected);
    });
});
```

### Integration Test Example

```javascript
const request = require('supertest');
const app = require('../../server/src/app');

describe('My API Endpoint', () => {
    let token;
    let orgId;

    beforeAll(async () => {
        // Login as admin
        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@demo.com', password: 'admin123' });
        
        token = login.body.data.token;
        orgId = login.body.data.organization.id;
    });

    test('GET /api/v1/my-endpoint should return data', async () => {
        const res = await request(app)
            .get('/api/v1/my-endpoint')
            .set('Authorization', `Bearer ${token}`)
            .set('x-organization-id', orgId);
        
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
    });
});
```

## Coverage Report

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in your browser to see detailed coverage report.

Target coverage: 80%+ for business logic modules.
