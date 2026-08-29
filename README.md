# Customer Employee Portal — Zoho One Integration (MVP)

A custom employee portal with its own authentication and database-backed RBAC system, through which employees access Zoho One services (CRM and Desk) — without ever logging into Zoho directly or receiving a Zoho token in the browser.

Built as an internship technical assessment. Scope is deliberately kept to what's specified: no Zoho Books, no microservices, no Redis/Kafka/Docker.

---

## 1. Project Overview

Employees log in once, to the portal. What they see next — which admin tools, which Zoho dashboards — is entirely determined by roles and permissions stored in the portal's own MySQL database, not by anything Zoho knows about them. The backend is the only thing that ever talks to Zoho; the frontend only ever talks to the backend.

## 2. Business Problem

Companies using Zoho One often need employees to touch only a slice of it (a salesperson needs CRM, not Desk; a support agent needs Desk, not CRM) without provisioning individual Zoho logins for everyone or trusting the frontend to enforce that boundary. This portal centralizes auth and authorization in one place the company controls, and proxies the relevant Zoho data through it.

## 3. Features

- Custom email/password login with hashed passwords and HTTP-only JWT cookies
- Database-backed RBAC: Users → Roles → Permissions, many-to-many at both joins
- Admin console: Users CRUD, Roles CRUD, permission assignment, user-role assignment
- Audit log of security-relevant events, paginated
- Zoho CRM / Desk dashboards, gated per-service by permission
- Demo mode: fully working, clearly-labeled sample data when real Zoho credentials aren't configured
- Responsive UI (desktop / tablet / mobile) with loading, error, and empty states throughout

## 4. Architecture

```
React (Vite, Bootstrap)
        │  fetch, credentials: include
        ▼
Express API  ──authenticate──▶ verify JWT cookie, load user + permissions from MySQL
        │
        └──authorize(permission)──▶ 403 if missing, else continue
                │
                ├─▶ Users / Roles / Permissions / Audit Log controllers → MySQL (mysql2)
                │
                └─▶ Zoho controllers → services/zoho/* → ZOHO_DEMO_MODE ? demo data : real Zoho API
```

The frontend never sees a JWT, a Zoho access token, or a Zoho client secret. All of that stays server-side.

## 5. Tech Stack

- **Frontend:** React (Vite), Bootstrap 5, React Router — plain JavaScript (no TypeScript, per project decision)
- **Backend:** Node.js, Express — plain JavaScript
- **Database:** MySQL, accessed directly via `mysql2` (no ORM — hand-written parameterized SQL and plain `.sql` migration files)
- **Auth:** JWT in an HTTP-only cookie, `bcryptjs` for password hashing
- **Validation:** Zod, enforced on the backend (the real security boundary) as well as the frontend (UX only)

## 6. Folder Structure

```
Customer_Employee_Portal/
  backend/
    src/
      config/env.js            # loads & validates all env vars (zod)
      db/                      # mysql2 pool, migration runner, seed script, .sql migrations
      models/                  # raw SQL query functions per entity
      services/                # business logic: auth (JWT/cookie), audit log, zoho/*
      controllers/              # request handlers
      routes/                  # Express routers, wire middleware + controllers
      middleware/               # authenticate, authorize, validate, errorHandler
      utils/asyncHandler.js
      app.js, server.js
  frontend/
    src/
      lib/api.js                # fetch wrapper (credentials included, typed ApiError)
      context/                  # AuthContext, ToastContext
      components/layout/         # Topbar, Sidebar, AppLayout, ProtectedRoute, RequirePermission
      components/ui/             # Spinner, ErrorState, EmptyState, Modal, RoleBadge
      components/users/, roles/, zoho/   # feature-specific form/modal components
      pages/                     # Login, Dashboard, admin/*, zoho/*
  README.md
```

## 7. Database Schema

MySQL, InnoDB, all foreign keys enforced:

```
departments(id PK, name UNIQUE)

users(id PK, name, email UNIQUE, password_hash, status ENUM('ACTIVE','INACTIVE'),
      department_id FK→departments, created_at, updated_at)

roles(id PK, name UNIQUE, description, created_at, updated_at)

permissions(id PK, name UNIQUE, description)

user_roles(user_id FK→users, role_id FK→roles, PK(user_id, role_id))

role_permissions(role_id FK→roles, permission_id FK→permissions, PK(role_id, permission_id))

audit_logs(id PK, user_id FK→users NULLABLE, action, resource, resource_id NULLABLE,
           metadata JSON, ip_address, user_agent, created_at,
           INDEX(user_id), INDEX(action), INDEX(created_at))
```

Passwords, password hashes, JWT secrets, and Zoho tokens/secrets are never written to `audit_logs`.

## 8. Authentication Flow

```
Login form → POST /api/auth/login → look up user → bcrypt.compare
    → sign JWT { sub: userId } → set httpOnly/sameSite=lax cookie → LOGIN_SUCCESS audit log
    → GET /api/auth/me on every subsequent page load re-verifies the cookie
      and re-fetches the user's current roles/permissions from the DB (not from
      stale JWT claims) — so an admin revoking a role takes effect on that
      user's very next request, not just their next login.
```

`POST /api/auth/logout` clears the cookie. A missing/expired/invalid cookie returns `401`; the frontend catches this globally on data-fetching pages and redirects to `/login` with a "session expired" message.

## 9. RBAC Flow

```
User ──(user_roles)──▶ Role(s) ──(role_permissions)──▶ Permission(s)
```

Every protected backend route runs `authenticate` (verifies the session) then `authorize('SOME_PERMISSION')` (checks the flattened permission set). A denied request is logged as `UNAUTHORIZED_ACCESS_ATTEMPT` and returns `403`. This is the real security boundary — the frontend additionally uses `hasPermission()` to hide nav items and buttons, purely for UX, never as the actual gate.

Roles seeded: **ADMIN** (all permissions), **SALES** (`ZOHO_CRM_VIEW`), **SUPPORT** (`ZOHO_DESK_VIEW`). See [Known Limitations](#25-known-limitations) for why HR/Zoho People and the Manager role, both present in the assignment brief, were descoped from this build.

A safety guard prevents deactivating the last active ADMIN or stripping the ADMIN role from them, and prevents deleting the ADMIN role itself or any role still assigned to a user.

## 10. Zoho Integration Flow

```
GET /api/zoho/crm → authenticate → authorize('ZOHO_CRM_VIEW') → ZohoCRMService.getCrmDashboard()
    → ZOHO_DEMO_MODE=true?  return labeled demo data
                    false?  ZohoAuthService gets/refreshes an access token,
                            calls the real Zoho CRM API, maps the response,
                            returns a sanitized shape
```

`services/zoho/zohoAuth.service.js` holds the refresh-token exchange and an in-memory access-token cache; it is the only place a Zoho token exists, and it never leaves the backend process.

## 11. Role / Service Mapping

| Role    | Users admin | Roles admin | Audit Logs | Zoho CRM | Zoho Desk |
|---------|:-----------:|:-----------:|:----------:|:--------:|:---------:|
| ADMIN   | ✓ (full)    | ✓ (full)    | ✓          | ✓        | ✓         |
| SALES   | –           | –           | –          | ✓        | –         |
| SUPPORT | –           | –           | –          | –        | ✓         |

## 12. Environment Variables

**`backend/.env`** (see `backend/.env.example`):

```
PORT, NODE_ENV, FRONTEND_ORIGIN

DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

JWT_SECRET          # required, no default — set a long random value in production
JWT_EXPIRES_IN       # e.g. "2h"
COOKIE_NAME

ZOHO_DEMO_MODE        # true = demo data, false = call real Zoho APIs
ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
ZOHO_REDIRECT_URI, ZOHO_ACCOUNTS_URL

ZOHO_API_BASE_URL          # Zoho CRM's API domain (e.g. https://www.zohoapis.in — match your data center)
ZOHO_DESK_API_BASE_URL     # Zoho Desk has its own separate API domain (e.g. https://desk.zoho.in)
ZOHO_DESK_ORG_ID           # required by every Zoho Desk endpoint except /organizations —
                             # find it under Zoho Desk > Setup > Developer Space > API
```

**`frontend/.env`** (see `frontend/.env.example`): only `VITE_API_URL` — no secrets ever live in frontend env vars, since Vite inlines them into the shipped JS bundle.

## 13. MySQL Setup

Have a MySQL server reachable with the credentials in `backend/.env`. The migration runner creates the database itself if it doesn't exist:

```
cd backend
cp .env.example .env   # fill in DB_* and a real JWT_SECRET
npm install
npm run migrate
```

## 14. "Prisma Setup" — N/A

This project intentionally uses raw `mysql2` rather than an ORM (see [Tech Stack](#5-tech-stack)); there is no Prisma schema. Table definitions live in `backend/src/db/migrations/*.sql`.

## 15. Database Migration

```
npm run migrate
```

Idempotent — applied migrations are tracked in a `_migrations` table, so re-running is safe and only applies new files.

## 16. Seed Instructions

```
npm run seed
```

Seeds departments, all 12 permissions, all 3 roles with their permission mappings, and 3 demo users. Safe to re-run (upserts) — also removes the retired People/HR/Manager rows if run against a database seeded by an earlier version of this project.

## 17. Demo Credentials

All seeded users share the password **`Password123!`**. This is a development/demo password only — never use it, or any credential in this repo, in a real deployment.

| Email | Role |
|---|---|
| admin@example.com | ADMIN |
| sales@example.com | SALES |
| support@example.com | SUPPORT |

## 18–19. Zoho Developer Setup / OAuth Setup

This was done and tested against a live Zoho account (India data center). Steps taken:

1. Created a **Self Client** in the [Zoho API Console](https://api-console.zoho.com/), getting a Client ID and Client Secret.
2. Activated Zoho CRM and Zoho Desk for the account (each app needs its one-time setup wizard completed before the API will issue tokens for it — a plain "not part of any service org" error otherwise).
3. Generated a grant token (Self Client → Generate Code) with the scopes listed below, then exchanged it for a refresh token:
   ```
   curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
     -d "code=<GRANT_TOKEN>" -d "client_id=<ID>" -d "client_secret=<SECRET>" -d "grant_type=authorization_code"
   ```
4. Set `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, and the regional URLs in `backend/.env`, flipped `ZOHO_DEMO_MODE=false`.

## 20. Required Scopes (verified against a live account)

```
ZohoCRM.modules.contacts.READ,Desk.basic.READ,Desk.tickets.READ
```

## 21. Demo Mode

`ZOHO_DEMO_MODE=true`. Each Zoho service returns static, clearly-labeled sample data — every response includes `"source": "DEMO_DATA"`, and the frontend renders a yellow **Demo Data** badge on every Zoho page. No real Zoho API is called in this mode. Useful for a quick demo without needing live credentials at all.

## 22. Real Zoho Mode

Set `ZOHO_DEMO_MODE=false` with real credentials configured (see §18–19). **Verified working** for CRM and Desk against a live Zoho account — the CRM/Desk pages show a green **Live Zoho Data** badge and real records when this mode is on. The same route → controller → service call path is used either way; switching modes is a config change, not a code change.

## 23. API Endpoints

```
POST   /api/auth/login          POST /api/auth/logout          GET /api/auth/me

GET/POST   /api/users           GET/PUT/DELETE /api/users/:id   PUT /api/users/:id/roles
GET/POST   /api/roles           GET/PUT/DELETE /api/roles/:id   PUT /api/roles/:id/permissions
GET        /api/permissions
GET        /api/departments     (supports the user create/edit form)

GET        /api/audit-logs?page=&limit=

GET        /api/zoho/services   GET /api/zoho/crm   GET /api/zoho/desk
```

Every route except `/auth/login` requires a valid session; every admin/Zoho route additionally requires the relevant permission (see [Role/Service Mapping](#11-role--service-mapping)).

## 24. Security Considerations

- Passwords hashed with bcrypt (never logged, never returned to the frontend)
- JWT in an `httpOnly`, `sameSite=lax` cookie — never readable by frontend JS, never in `localStorage`
- `secure` cookie flag enabled automatically when `NODE_ENV=production` — **requires HTTPS in production** for the cookie to actually be sent
- All SQL is parameterized (`mysql2` placeholders) — no string-concatenated queries
- Zod validation on every write endpoint; 400 with field-level errors on failure
- Rate limiting on `/api/auth/login` (10 attempts / 15 min per IP)
- Stack traces never returned to the client in production (`NODE_ENV=production` collapses 500s to a generic message server-side logs still capture the detail)
- Zoho tokens/secrets exist only in backend memory/env, never serialized to the frontend or the audit log

## 25. Known Limitations

- **Zoho People (and the HR role that existed only to grant access to it) and the Manager role were descoped**, deviating from the assignment brief's "three services" / five-role list. Zoho CRM and Zoho Desk were both successfully wired up and verified against a live Zoho account (see §18–22). Zoho People's REST API consistently returned `Invalid OAuth Scope` (Zoho error code 7218) even after regenerating the OAuth grant with the documented `ZOHOPEOPLE.employee.ALL` scope multiple times and confirming the Self Client was authorized for it — the root cause wasn't resolved in the time available, so rather than ship a broken or permanently-demo-only third service (with an HR role that would otherwise have nothing to do), both were removed. Final scope: 2 Zoho services (CRM, Desk), 3 roles (ADMIN, SALES, SUPPORT). This was a deliberate, informed trade-off, not an oversight — happy to walk through the debugging that led here.
- **No password-reset flow.** Out of scope for this MVP; an admin can only edit name/email/department/status, not reset a user's password.
- **Hard delete is not implemented for users.** "Delete" is implemented as deactivation (`status = INACTIVE`) to preserve audit-log referential integrity and history — this was a deliberate simplification, not an oversight.

## 26. Local Development

```
# Terminal 1
cd backend
cp .env.example .env   # fill in DB_* and JWT_SECRET
npm install
npm run migrate
npm run seed
npm run dev             # http://localhost:4000

# Terminal 2
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## 27. Production Build

```
cd frontend && npm run build     # outputs frontend/dist — verified to build cleanly
cd backend  && NODE_ENV=production npm start
```

The backend has no separate build step (plain JavaScript, no TypeScript compilation). For a true single-origin production deployment, serve `frontend/dist` as static files from the Express app and point `FRONTEND_ORIGIN`/cookie settings accordingly — this repo runs the two as separate dev servers, which is sufficient for local demonstration.
