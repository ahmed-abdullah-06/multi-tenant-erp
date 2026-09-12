# Multi-Tenant ERP SaaS

A production-style, multi-tenant Enterprise Resource Planning (ERP) system built as a portfolio project. Supports multiple organizations on a single shared database, with strict tenant data isolation, role-based access control, and modules covering inventory, purchasing, sales, expenses, and more.

## Tech Stack

- **Backend:** Node.js, Express 5
- **ORM / Database:** Prisma + PostgreSQL
- **Auth:** JWT (Bearer tokens), bcrypt password hashing
- **Frontend:** HTML5, CSS3, vanilla JavaScript (no framework)
- **Security:** Helmet, CORS

## Architecture

- **Multi-tenancy model:** shared database, shared tables, with an `organizationId` column on every tenant-owned entity.
- **Tenant resolution:** the active organization is never trusted from client input. It's derived from a verified `Membership` record, resolved per-request by `tenantResolver` middleware, and attached to `req.tenantId`.
- **Access control:** role-based permissions checked per-route via `rbacMiddleware`, scoped to the user's membership in the active organization.
- **Module pattern:** every business domain (`auth`, `inventory`, `sales`, etc.) follows the same four-file structure:
  - `<module>.routes.js` — Express router, wires auth → tenant resolution → permission check → validation → controller
  - `<module>.controller.js` — thin request/response handling only
  - `<module>.service.js` — all Prisma queries, always tenant-scoped
  - `<module>.validator.js` — request validation middleware

## Project Structure

```
multi-tenant-erp/
├── client/                  # Vanilla JS frontend
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── css/
│   └── js/
│       ├── api/             # Fetch wrapper (apiClient.js)
│       ├── auth/            # authGuard.js
│       ├── components/      # sidebar, navbar
│       ├── pages/
│       └── state/           # store.js (session state)
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.js
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── lib/              # prisma singleton, logger, response helper
│       ├── middleware/       # auth, tenant resolver, RBAC, error handler
│       ├── routes/
│       └── modules/
│           ├── auth/
│           ├── organizations/
│           ├── users/
│           ├── rbac/
│           ├── employees/
│           ├── inventory/
│           ├── purchasing/
│           ├── sales/
│           ├── expenses/
│           ├── reports/
│           ├── notifications/
│           ├── audit/
│           └── billing/
├── tests/
└── docs/
```

## Modules

| Module | Description |
|---|---|
| `auth` | Registration, login, JWT issuance |
| `organizations` | Organization creation, org switching |
| `users` | User management |
| `rbac` | Roles and permissions |
| `employees` | Employee records |
| `inventory` | Products, stock levels, stock movements |
| `purchasing` | Purchase orders, supplier receiving (stock increases via transaction) |
| `sales` | Sales orders, fulfillment (stock decreases via transaction) |
| `expenses` | Expense tracking |
| `reports` | Aggregated, tenant-scoped reporting endpoints |
| `notifications` | In-app notifications |
| `audit` | Audit log of key actions |
| `billing` | Subscription/plan management |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp server/.env.example .env
# then fill in DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# Start the dev server
npm run dev
```

The app serves both the API and the static frontend from the same server:
- Frontend: `http://localhost:5000`
- API base: `http://localhost:5000/api/v1`
- Health check: `http://localhost:5000/health`

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWTs — required, no default |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `1d`) |
| `PORT` | Server port (defaults to 5000) |

## Security Notes

- Never trust a client-supplied organization ID — it is always re-verified against the database on every request via `tenantResolver`.
- Every tenant-scoped `update`/`delete` operation uses `updateMany`/`deleteMany` with both `id` and `organizationId` in the `where` clause, to prevent cross-tenant writes.
- A single shared Prisma Client instance is used app-wide (`server/src/lib/prisma.js`) to avoid exhausting database connections.

## Known Limitations / Roadmap

- [ ] Warehouse-to-warehouse stock transfer (schema exists, service not yet implemented)
- [ ] Rate limiting on auth endpoints
- [ ] Database seed script for demo/test data
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Automated test suite
- [ ] Webhooks, API keys, background jobs (advanced/later-stage features)

## License

ISC