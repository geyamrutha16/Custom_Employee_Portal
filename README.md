# Customer Employee Portal — Zoho One Integration (MVP)

## Overview

A single-login employee portal where **role-based access, not Zoho, decides what each employee sees**. Roles and permissions live in the portal's own MySQL database; the frontend never talks to Zoho directly — only the backend does, after checking the caller's permissions.

**Problem it solves:** companies on Zoho One often want a salesperson to see CRM (not Desk) and a support agent to see Desk (not CRM), without provisioning individual Zoho logins for everyone or trusting the frontend to enforce that boundary.

## Architecture

```
React (Vite, Bootstrap)
        │ fetch, credentials: include
        ▼
Express API → authenticate (JWT cookie) → authorize(permission) → 403 or continue
        │
        ├─▶ Users / Roles / Permissions / Audit Log → MySQL (mysql2, raw parameterized SQL)
        └─▶ Zoho controllers → ZOHO_DEMO_MODE ? demo data : real Zoho CRM/Desk API
```

No JWT, Zoho token, or client secret is ever exposed to the frontend.

## Tech Stack

- **Frontend:** React (Vite), Bootstrap 5, React Router — plain JavaScript
- **Backend:** Node.js, Express — plain JavaScript
- **Database:** MySQL via `mysql2` (no ORM; hand-written parameterized SQL, `.sql` migrations)
- **Auth:** JWT in an HTTP-only cookie, `bcryptjs` password hashing
- **Validation:** Zod, enforced server-side (frontend validation is UX-only)

## Key Design Points

- **RBAC:** `users → user_roles → roles → role_permissions → permissions`, both joins many-to-many. Every protected route runs `authenticate` then `authorize('PERMISSION')`; a denial is logged and returns 403. Frontend permission checks only hide UI — they are never the real gate.
- **Fresh permissions on every request:** `GET /api/auth/me` re-fetches the user's current roles/permissions from the DB (not from JWT claims) on every page load, so revoking a role takes effect immediately, not just at next login.
- **Roles seeded:** ADMIN (all permissions), SALES (`ZOHO_CRM_VIEW`), SUPPORT (`ZOHO_DESK_VIEW`).
- **Zoho integration:** `ZohoAuthService` handles refresh-token exchange and caches the access token in backend memory only. Demo mode returns clearly-labeled static data (`"source": "DEMO_DATA"`, yellow badge in UI); live mode calls the real Zoho CRM/Desk APIs (green "Live Zoho Data" badge) — switching is a config flag, not a code change. Verified working against a live Zoho account (India data center).
- **Audit log:** every security-relevant event (logins, unauthorized attempts, admin actions) is recorded; passwords, hashes, JWT secrets, and Zoho tokens are never written to it.

## Security

- Bcrypt-hashed passwords; JWT in an `httpOnly`, `sameSite=lax` cookie (never in `localStorage`); `secure` flag auto-enabled in production
- All SQL parameterized; Zod validation on every write endpoint
- Rate limiting on login (10 attempts / 15 min per IP)
- Stack traces never returned to the client in production
- Safety guard against deactivating/demoting the last ADMIN, or deleting an in-use role

## API Surface

```
POST /api/auth/login | logout      GET /api/auth/me
CRUD /api/users, /api/roles         GET /api/permissions, /api/departments
GET  /api/audit-logs?page=&limit=
GET  /api/zoho/services | /crm | /desk
```

## Running Locally

```bash
# backend
cd backend && cp .env.example .env   # set DB_*, JWT_SECRET
npm install && npm run migrate && npm run seed && npm run dev   # :4000

# frontend
cd frontend && cp .env.example .env
npm install && npm run dev   # :5173
```

Demo login:

| Email | Role |
|---|---|
| admin@example.com | ADMIN |
| sales@example.com | SALES |
| support@example.com | SUPPORT |
