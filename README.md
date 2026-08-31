# Custom Employee Portal — Zoho One Integration (MVP)

A custom employee portal with its own authentication and database-backed RBAC system. Zoho CRM and Zoho Desk appear on the dashboard as permission-gated links: the first click sends the employee through Zoho's own OAuth consent screen (no Zoho password ever touches this backend), then lands them in the real Zoho web app. After that first authorization, the backend can also call Zoho's REST API directly on that employee's behalf, using their securely stored, encrypted refresh token — no repeated consent needed.

Built as an internship technical assessment. Scope is deliberately kept to what's specified: no Zoho Books, no microservices, no Redis/Kafka/Docker.

---

## 1. Project Overview

Employees log in once, to the portal. What they see next — which admin tools, which Zoho dashboards — is entirely determined by roles and permissions stored in the portal's own MySQL database, not by anything Zoho knows about them. The backend is the only thing that ever talks to Zoho; the frontend only ever talks to the backend.

## 2. Business Problem

Companies using Zoho One often need employees to only *see* the slice of it relevant to their job (a salesperson needs a way to get to CRM, not Desk; a support agent needs Desk, not CRM) without provisioning individual Zoho logins for everyone or trusting the frontend alone to enforce that boundary. This portal centralizes auth and authorization in one place the company controls: the dashboard only shows the Zoho links an employee's role actually grants, backed by the same database-driven RBAC as the rest of the portal.

## 3. Features

- Custom email/password login with hashed passwords and HTTP-only JWT cookies
- Database-backed RBAC: Users → Roles → Permissions, many-to-many at both joins
- Admin console: Users CRUD, Roles CRUD, permission assignment, user-role assignment
- Audit log of security-relevant events, paginated
- Zoho CRM and Zoho Desk launcher links — first click runs a per-employee OAuth 2.0 Authorization Code flow (Zoho's own consent screen, then the real Zoho web app); visible only to roles with the matching permission
- Backend REST API access to Zoho CRM/Desk after that first authorization, using each employee's own encrypted refresh token — no shared service account, no repeated consent
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
                └─▶ Users / Roles / Permissions / Audit Log controllers → MySQL (mysql2)

GET /api/zoho/services → returns each Zoho app's authorize-endpoint URL + whether this user is authorized
        → Dashboard/NavLinks render an <a target="_blank"> to /api/zoho/oauth/:app/authorize, or hide it
                │
                ▼
/api/zoho/oauth/:app/authorize ──▶ redirect to Zoho's own OAuth consent screen (state = CSRF nonce)
                │  employee signs in / clicks "Allow" on Zoho's domain — we never see their password
                ▼
/api/zoho/oauth/callback ──▶ exchange code for refresh_token → AES-256-GCM encrypt → store in
        zoho_tokens, keyed by (user_id, app_name) → redirect into the real Zoho web app

GET /api/zoho/crm, /api/zoho/desk ──authenticate + authorize(permission)──▶ mint a fresh
        access_token from that employee's stored refresh_token → call Zoho's REST API directly
```

The frontend never sees a JWT, and it never sees a Zoho password or token either. See [§10](#10-zoho-integration-flow) for the full OAuth methodology.

## 5. Tech Stack

- **Frontend:** React (Vite), Bootstrap 5, React Router — plain JavaScript (no TypeScript, per project decision)
- **Backend:** Node.js, Express — plain JavaScript
- **Database:** MySQL, accessed directly via `mysql2` (no ORM — hand-written parameterized SQL and plain `.sql` migration files)
- **Auth:** JWT in an HTTP-only cookie, `bcryptjs` for password hashing
- **Validation:** Zod, enforced on the backend (the real security boundary) as well as the frontend (UX only)

## 6. Folder Structure

```
Custom_Employee_Portal/
  backend/
    src/
      config/env.js            # loads & validates all env vars (zod)
      db/                      # mysql2 pool, migration runner, seed script, .sql migrations
      models/                  # raw SQL query functions per entity
      services/
        auditLog.service.js     # audit log writes
        zoho/
          zohoOAuth.service.js   # builds Zoho's authorize URL, exchanges code → refresh_token
          zohoTokenStore.service.js  # encrypt/store/read each employee's refresh_token
          zohoAuth.service.js    # mints fresh access_tokens from a stored refresh_token
          zohoFetch.js           # authorized fetch wrapper for Zoho REST calls
          zohoCrm.service.js, zohoDesk.service.js  # the actual CRM/Desk API calls
      controllers/
        zoho.controller.js       # GET /services, /crm, /desk
        zohoOAuth.controller.js  # GET /oauth/:app/authorize, /oauth/callback
      routes/                  # Express routers, wire middleware + controllers
      middleware/               # authenticate, authorize, validate, errorHandler
      utils/
        asyncHandler.js
        tokenCrypto.js           # AES-256-GCM encrypt/decrypt for refresh tokens at rest
      app.js, server.js
  frontend/
    src/
      lib/api.js                # fetch wrapper (credentials included, typed ApiError)
      context/                  # AuthContext, ToastContext
      components/layout/         # Topbar, Sidebar (NavLinks), AppLayout, ProtectedRoute, RequirePermission
      components/ui/             # Spinner, ErrorState, EmptyState, Modal, RoleBadge
      components/users/, roles/   # feature-specific form/modal components
      pages/                     # Login, Dashboard, admin/*  (no zoho/* pages — Zoho links leave the SPA)
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

zoho_tokens(id PK, user_id FK→users, app_name, encrypted_refresh_token, iv, auth_tag,
            created_at, updated_at, UNIQUE(user_id, app_name))
```

Passwords, password hashes, JWT secrets, and Zoho tokens/secrets are never written to `audit_logs`. Refresh tokens in `zoho_tokens` are stored AES-256-GCM encrypted (`encrypted_refresh_token`, `iv`, `auth_tag`) — the plaintext token never touches disk.

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

Each employee authorizes Zoho CRM/Desk individually via OAuth 2.0 Authorization Code grant — a standard "connect your account" flow, the same shape as "Sign in with Google." No Zoho password, of any employee's, is ever seen by this backend.

**Phase 1 — first click, interactive:**

```
Employee clicks "Zoho CRM"
    → GET /api/zoho/oauth/crm/authorize   (authenticate + authorize('ZOHO_CRM_VIEW'))
    → backend generates a single-use, 10-minute state token, redirects to
      Zoho's own /oauth/v2/auth (response_type=code, our client_id, scope,
      access_type=offline, state)
    → Zoho — not us — handles login and shows the consent ("Allow") screen
    → Zoho redirects to GET /api/zoho/oauth/callback?code=...&state=...
```

**Phase 2 — backend token exchange:**

```
oauthCallback validates `state` against the pending map (CSRF defense — Zoho's
    redirect can't be trusted to carry our session cookie reliably) and deletes
    it (single-use)
    → exchangeCodeForRefreshToken(code): server-to-server POST to Zoho's
      /oauth/v2/token with client_id + client_secret + code
    → refresh_token encrypted (AES-256-GCM) and stored in zoho_tokens,
      keyed by (user_id, app_name)
    → audit log entry: ZOHO_SERVICE_ACCESS
    → browser redirected into the real crm.zoho.in / desk.zoho.in — already
      authenticated, because Zoho's own login step just happened in this
      same browser
```

**Phase 3 — every subsequent click, and any backend API access:**

```
GET /api/zoho/crm | /api/zoho/desk   (authenticate + authorize(permission))
    → getZohoAccessToken(appName, userId): decrypt the stored refresh_token,
      exchange it for a fresh access_token (grant_type=refresh_token),
      cached in memory until near-expiry
    → call Zoho's REST API directly (Authorization: Zoho-oauthtoken <token>)
    → return the parsed CRM contacts / Desk tickets as JSON
```

The authorize redirect deliberately omits `prompt=consent` — once an employee has granted access once, Zoho remembers that grant independently of their browser session and skips the "Allow" screen on future authorizations. Their Zoho *login* session is a separate thing Zoho controls entirely; if it has expired, Zoho will ask them to sign in again (their own credentials, on Zoho's own domain) but will not ask for consent a second time.

**What this does and doesn't achieve, precisely:**

- ✅ No Zoho password is ever handled, stored, or seen by this backend — only an encrypted refresh token per employee.
- ✅ Repeated *consent* prompts are eliminated permanently after the first authorization.
- ✅ RBAC is still the real gate: `authorize(permission)` runs before Zoho is contacted at all, for both the browser-redirect endpoint and the API endpoints.
- ❌ It does **not** eliminate Zoho's *login* screen reappearing once the employee's Zoho browser session naturally expires — that's controlled entirely by Zoho's session lifecycle, and no OAuth token (Self Client, per-employee, or otherwise) can substitute for an active session. The only mechanisms that remove that dependency entirely are SAML SSO (federated trust per request, no session dependency) or a stored, human-usable credential (the reverse-proxy pattern this project deliberately avoided — see [Known Limitations](#25-known-limitations)).
- Each employee does have a real, individual OAuth grant recorded on Zoho's side (visible in their Zoho account's connected-apps list) — this is a deliberate trade-off for eliminating password handling, not the same as "zero Zoho-side identity."

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

ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET   # from a Server-based Application in the Zoho API Console
ZOHO_ACCOUNTS_URL        # e.g. https://accounts.zoho.in — match your data center
ZOHO_API_BASE_URL        # e.g. https://www.zohoapis.in
ZOHO_DESK_API_BASE_URL   # e.g. https://desk.zoho.in
ZOHO_DESK_ORG_ID         # required by every Zoho Desk API call except /organizations
ZOHO_REDIRECT_URI        # must exactly match the redirect URI registered for this client
ZOHO_CRM_PORTAL_URL      # real Zoho CRM web app — where the employee lands after consent
ZOHO_DESK_PORTAL_URL     # real Zoho Desk web app — where the employee lands after consent
TOKEN_ENCRYPTION_KEY     # 32 bytes, base64 (openssl rand -base64 32) — encrypts stored refresh tokens
```

Unlike a Self Client setup, there's no one-off admin script to run — each employee's authorization happens through their own browser click (see [§10](#10-zoho-integration-flow)); `ZOHO_CLIENT_ID`/`SECRET` just identify *our app* to Zoho, not any individual employee.

**`frontend/.env`** (see `frontend/.env.example`): just `VITE_API_URL`. The Zoho links are full absolute URLs returned by `GET /api/zoho/services` (pointing at this backend's own `/oauth/:app/authorize` endpoints), fetched dynamically by both the Dashboard cards and `NavLinks.jsx` — no Zoho URLs or secrets live in frontend env vars.

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

One-time setup, done by whoever administers the Zoho org (needs to be a real Zoho account, but not necessarily admin — API Console access is per-user, not org-wide):

1. Go to the [Zoho API Console](https://api-console.zoho.com) → **Add Client** → **Server-based Applications** (not Self Client — that's for machine-only access with no per-employee consent).
2. Fill in Client Name / Homepage URL, and set **Authorized Redirect URIs** to exactly `ZOHO_REDIRECT_URI` from your `.env` — Zoho matches this string exactly, so a trailing slash mismatch will break the flow.
3. Copy the generated **Client ID** and **Client Secret** into `backend/.env`.
4. Generate a `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`) and set it too.

No further setup is needed — there's no admin script to run and no refresh token to generate manually. Each employee authorizes themselves the first time they click "Zoho CRM"/"Zoho Desk" in the portal (see [§10](#10-zoho-integration-flow)).

## 20. Required Scopes

- Zoho CRM: `ZohoCRM.modules.contacts.READ`
- Zoho Desk: `Desk.tickets.READ`

Both are read-only, minimum-necessary scopes matching exactly what `zohoCrm.service.js` / `zohoDesk.service.js` fetch — not broad "ALL" scopes.

## 21. Demo Mode / 22. Real Zoho Mode — N/A in this fork

There's no demo-data fallback — the integration always calls Zoho's real OAuth and REST endpoints. If `ZOHO_CLIENT_ID`/`SECRET` are unset, the authorize redirect will fail against Zoho (not silently substitute fake data), since real Zoho API Console credentials are required for this flow to exist at all.

## 23. API Endpoints

```
POST   /api/auth/login          POST /api/auth/logout          GET /api/auth/me

GET/POST   /api/users           GET/PUT/DELETE /api/users/:id   PUT /api/users/:id/roles
GET/POST   /api/roles           GET/PUT/DELETE /api/roles/:id   PUT /api/roles/:id/permissions
GET        /api/permissions
GET        /api/departments     (supports the user create/edit form)

GET        /api/audit-logs?page=&limit=

GET        /api/zoho/services              # list, with authorize-endpoint URL + authorized flag
GET        /api/zoho/oauth/:app/authorize  # authenticated; redirects to Zoho's consent screen
GET        /api/zoho/oauth/callback        # public — Zoho redirects here after consent
GET        /api/zoho/crm                   # authenticated + authorize('ZOHO_CRM_VIEW')
GET        /api/zoho/desk                  # authenticated + authorize('ZOHO_DESK_VIEW')
```

`/api/zoho/oauth/callback` is the one route in this app with no `authenticate` middleware — Zoho's redirect can't reliably carry our session cookie, so identity comes from the single-use `state` token instead (see [§10](#10-zoho-integration-flow)).

Every other route requires a valid session; every admin/Zoho route additionally requires the relevant permission (see [Role/Service Mapping](#11-role--service-mapping)) — checked before any Zoho call is made, not after.

## 24. Security Considerations

- Passwords hashed with bcrypt (never logged, never returned to the frontend)
- JWT in an `httpOnly`, `sameSite=lax` cookie — never readable by frontend JS, never in `localStorage`
- `secure` cookie flag enabled automatically when `NODE_ENV=production` — **requires HTTPS in production** for the cookie to actually be sent
- All SQL is parameterized (`mysql2` placeholders) — no string-concatenated queries
- Zod validation on every write endpoint; 400 with field-level errors on failure
- Rate limiting on `/api/auth/login` (10 attempts / 15 min per IP)
- Stack traces never returned to the client in production (`NODE_ENV=production` collapses 500s to a generic message server-side logs still capture the detail)
- Zoho refresh tokens encrypted at rest (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`) — never stored or logged in plaintext; a corrupted/undecryptable row (e.g. after key rotation) is treated as "not yet authorized," not surfaced as a crash
- Zoho OAuth callback protected by a single-use, 10-minute-TTL `state` token (CSRF defense) — see [§10](#10-zoho-integration-flow)
- No employee's Zoho password is ever received, transmitted, or stored by this backend at any point

## 25. Known Limitations

- **Zoho People (and the HR role that existed only to grant access to it) and the Manager role were descoped**, deviating from the assignment brief's "three services" / five-role list. Zoho People's REST API consistently returned `Invalid OAuth Scope` (Zoho error code 7218) even after regenerating the OAuth grant with the documented `ZOHOPEOPLE.employee.ALL` scope multiple times and confirming the Self Client was authorized for it — the root cause wasn't resolved in the time available, so rather than ship a broken or permanently-demo-only third service (with an HR role that would otherwise have nothing to do), both were removed. Final scope: ADMIN, SALES, SUPPORT roles. This was a deliberate, informed trade-off, not an oversight.
- **Zoho's login screen can still reappear, even after the first authorization** (see §10) — once an employee's Zoho browser session naturally expires, clicking "Zoho CRM" again will require them to sign in to Zoho again (their own credentials, on Zoho's domain). This is a hard boundary of any OAuth-token-based approach: a refresh token authorizes API calls, it cannot substitute for or extend a browser login session, and nothing in this codebase can change that. Consent ("Allow") is not re-asked, since that's remembered by Zoho independently of session state — only the sign-in step can reappear. The only ways to remove that dependency entirely are SAML SSO (federated trust per request) or a stored, human-equivalent credential (deliberately not used here — see the next point).
- **Each employee has an individual OAuth grant on Zoho's side**, not a fully credential-free relationship — this is the trade-off made to avoid ever handling a Zoho password. An earlier iteration of this project used a single shared Self Client (service-account) identity instead, which avoids per-employee Zoho-side records entirely but loses per-employee audit attribution on Zoho's side and can't land the employee's browser inside the real Zoho web app at all (Self Client tokens are API-only — verified against Zoho's own OAuth documentation). A reverse-proxy pattern using a stored, real Zoho login (headless browser automation) was also evaluated and rejected: it would remove the Zoho login screen unconditionally, but requires storing a genuine human-usable Zoho password server-side, is fragile against any Zoho login-page change, and sits outside Zoho's sanctioned integration methods (ToS risk). This project's OAuth-per-employee approach was chosen as the best balance of those trade-offs, not because it's trade-off-free.
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
