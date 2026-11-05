# Deployment Checklist

Step-by-step guide to take this repo from a fresh clone to a live production deployment. Work top to bottom; every item is verified against the current codebase.

---

## 1. Provision services

- [ ] **PostgreSQL 14+** — managed (Neon, RDS, Supabase) or self-hosted. Create a dedicated database.
- [ ] **Redis 6+** — managed (Upstash, Elasticache) or self-hosted. Required for idempotency middleware and job queues.
- [ ] **Node.js 18+** on the host (or use a container — see §6).
- [ ] A **domain name** with **HTTPS** terminating at a reverse proxy (nginx/Caddy/Cloudflare) or platform load balancer.

## 2. Environment configuration

```bash
cp .env.example .env
```

Fill in every value. The critical ones:

| Variable | What to do |
|---|---|
| `DATABASE_URL` | Production Postgres URL. Use `?sslmode=require` where applicable. |
| `JWT_SECRET` | Generate fresh: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` — **never reuse the dev secret** |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `REDIS_URL` | Production Redis URL |
| `APP_URL` | Public HTTPS URL, e.g. `https://app.yourdomain.com` — used for verification/reset email links |
| `FRONTEND_URL` | Usually the same as `APP_URL` (the server serves the frontend itself) |
| `NODE_ENV` | `production` |
| `PORT` | Default `5000` (or front it with your reverse proxy) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | **Transactional email provider** (SendGrid, SES, Postmark, Mailgun SMTP). Do **not** ship with Gmail `EMAIL_USER`/`EMAIL_PASS` — it is dev-only and rate-limited. |
| `EMAIL_FROM` | A sender on your own domain, e.g. `Nexus ERP <notifications@yourdomain.com>` |
| `STRIPE_SECRET_KEY` | `sk_live_...` for real payments (or keep `sk_test_...` during soft launch) |
| `STRIPE_WEBHOOK_SECRET` | From the Stripe dashboard webhook endpoint (see §5) |
| `SENTRY_DSN` | Optional but recommended for error tracking |

Security checks before proceeding:

- [ ] `JWT_SECRET` is 64+ random chars and differs from every other environment
- [ ] `.env` is **not** committed (`git status` must not show it) and is `0600`/restricted on the server
- [ ] `NODE_ENV=production` (enables strict email failure handling and hardened defaults)

## 3. Build & database migration

```bash
npm ci                       # reproducible install from package-lock.json
npx prisma generate          # generate the Prisma client
npx prisma migrate deploy    # apply ALL migrations (no prompts — safe for prod)
```

- [ ] `migrate deploy` reports *"All migrations have been successfully applied"*
- [ ] Verify: `npx prisma migrate status` → *"Database schema is up to date!"*

> Use `migrate deploy` (not `migrate dev`) in production — it never prompts and never rewrites history.

## 4. Seed (optional, demo data only)

```bash
npx prisma db seed         # runs node server/prisma/seed.js (configured in package.json)
```

- [ ] **Skip on real customer data.** Seeding creates the demo org and `admin@demo.com` / `admin123` — change that password immediately or don't seed at all in production.

## 5. Stripe (payments)

- [ ] Create a webhook endpoint in the Stripe dashboard: `https://yourdomain.com/api/v1/billing/webhook`
- [ ] Subscribe to the relevant events (`checkout.session.completed`, `invoice.payment_failed`, …)
- [ ] Copy the signing secret into `STRIPE_WEBHOOK_SECRET`
- [ ] Swap `STRIPE_SECRET_KEY` to `sk_live_...` when ready to take real money
- [ ] Test one checkout end-to-end in test mode first

## 6. Run the server

**Direct (with a process manager):**

```bash
npm start                    # node server/src/server.js
```

Recommended: run it under **pm2**, **systemd**, or **Docker** so it restarts on crash/reboot.

```bash
# example: pm2
pm2 start server/src/server.js --name erp-api
pm2 save && pm2 startup
```

**Smoke test:**

- [ ] `GET /health` → `200` (https://yourdomain.com/health)
- [ ] `GET /` → frontend loads over HTTPS
- [ ] `GET /api-docs` → Swagger UI loads
- [ ] Register a new user → verify the **verification email actually arrives** (confirms SMTP config)
- [ ] Log in → dashboard renders
- [ ] Create a product, a sales order, fulfill it → stock deducts
- [ ] Password-reset email arrives and the link works (confirms `APP_URL`)

## 7. Reverse proxy / HTTPS

- [ ] Proxy `/` and `/api` to the Node process (preserve `X-Forwarded-*` headers)
- [ ] Force HTTPS (HSTS) and cert auto-renewal (Let's Encrypt / Cloudflare)
- [ ] If running multiple instances: sticky sessions or shared state are **not** required for REST, but WebSocket (`socket.io`) needs a single instance or a Redis adapter — currently one instance per deployment is assumed
- [ ] Body size limits and timeouts set for file uploads / long requests

## 8. Background jobs

- [ ] The app starts its BullMQ workers (webhooks, notifications, reports) from the main process — verify Redis is reachable at boot (look for the job-queue startup log lines)
- [ ] If you scale to multiple instances, run workers in a dedicated process instead of one-per-API-instance to avoid duplicate job execution

## 9. Monitoring & operations

- [ ] `SENTRY_DSN` set → errors appear in Sentry
- [ ] Log aggregation in place (the app logs structured JSON with `correlationId`)
- [ ] Alerting on `/health` failures
- [ ] Database backups enabled (PITR or daily snapshots) and **restore tested**
- [ ] Redis persistence/backup policy understood (idempotency keys are expendable; losing them is safe)

## 10. Security review (pre-launch)

- [ ] Rate limiting active (`apiLimiter` on all routes; auth-specific limits on login/register/forgot-password)
- [ ] CORS restricted to your real origins (check `cors` config in `server/src/app.js`)
- [ ] Cookies: `Secure` + `SameSite` set (cookie-consent banner already ships in the frontend)
- [ ] Privacy Policy + Terms pages live and linked in the footer (they ship with the app — confirm the URLs work on your domain)
- [ ] GDPR cookie-consent banner appears on first visit
- [ ] No default/demo credentials reachable (seed skipped or password changed)
- [ ] `prisma` and dependency audit: `npm audit` — address criticals
- [ ] File permissions: `.env` readable only by the service user

## 11. Post-launch verification

- [ ] Webhooks deliver: create an endpoint in **Integrations**, trigger an order, confirm delivery status shows `success` (HMAC-signed `x-webhook-signature` header)
- [ ] Email verification, invitation, and password-reset flows all deliver in production
- [ ] One full purchase cycle in **live Stripe test mode**, then a real low-value charge
- [ ] Load smoke test (e.g. `autocannon -c 20 -d 10 https://yourdomain.com/health`)

---

## Rollback plan

- **Code**: redeploy the previous git tag/commit (`git log` → `git checkout <sha>` → `npm ci` → restart)
- **Schema**: migrations are forward-only; to roll back a bad migration, write a new corrective migration (`npx prisma migrate dev --name fix_...`) — never edit applied migration files
- **Config**: keep the previous `.env` backed up (secrets manager recommended)

## Quick reference — first deploy in 6 commands

```bash
git clone <repo> && cd <repo>
npm ci
cp .env.example .env        # then edit it (§2)
npx prisma generate && npx prisma migrate deploy
npm start
curl https://yourdomain.com/health
```
