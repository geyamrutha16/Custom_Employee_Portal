# Custom Employee Portal — Zoho One Integration (MVP)

A custom employee portal with its own auth and database-backed RBAC. Zoho CRM and Zoho Desk appear on the dashboard as permission-gated links — clicking one runs a per-employee Zoho OAuth 2.0 Authorization Code flow (Zoho's own consent screen, no Zoho password ever touches this backend), then lands the employee in the real Zoho web app. After that first authorization, the backend also calls Zoho's REST API directly on that employee's behalf using their encrypted refresh token.

**Problem solved:** companies on Zoho One often want a salesperson to see CRM (not Desk) and a support agent to see Desk (not CRM), without individual Zoho provisioning done manually or trusting the frontend to enforce the boundary. Role-based access — not Zoho — decides what each employee sees; the frontend only ever talks to the backend, never to Zoho.

## Features
- Custom email/password login, hashed passwords, HTTP-only JWT cookies
- DB-backed RBAC: Users → Roles → Permissions (many-to-many)
- Admin console: Users/Roles CRUD, permission assignment
- Paginated audit log of security-relevant events
- Zoho CRM/Desk launchers: per-employee OAuth consent once, then real Zoho web app access + backend API calls via encrypted refresh token
- Responsive UI with loading/error/empty states

## Architecture
```
React (Vite) → Express API (authenticate → authorize(permission)) → MySQL

GET /api/zoho/services → dashboard shows only authorized Zoho links
/api/zoho/oauth/:app/authorize → redirect to Zoho consent screen
/api/zoho/oauth/callback → exchange code → encrypt refresh_token → store →
    redirect into real Zoho web app (already authenticated)
GET /api/zoho/crm | /desk → mint access_token from stored refresh_token → call Zoho REST API
```
Frontend never sees a JWT, Zoho password, or Zoho token.

## Tech Stack
React (Vite) + Bootstrap 5 · Node.js/Express · MySQL (`mysql2`, no ORM) · JWT in httpOnly cookie, bcryptjs · Zod validation (server-side)

## Key Design Points
- Every protected route: `authenticate` → `authorize('PERMISSION')`; denials logged, return 403. Frontend hiding is UX only.
- `/api/auth/me` re-fetches roles/permissions from DB on every load — revoking a role takes effect immediately.
- Roles seeded: ADMIN (all), SALES (`ZOHO_CRM_VIEW`), SUPPORT (`ZOHO_DESK_VIEW`).
- Demo/live Zoho mode is a config flag; verified against a live Zoho account (India DC).
- Audit log never stores passwords, hashes, secrets, or Zoho tokens.

## Security
Bcrypt passwords · JWT in httpOnly/sameSite=lax cookie (never localStorage) · parameterized SQL · Zod on all writes · login rate-limited (10/15min/IP) · no stack traces to client in prod · Zoho refresh tokens AES-256-GCM encrypted at rest · OAuth callback protected by single-use 10-min `state` token (CSRF) · no employee Zoho password ever touches this backend

## Data Model
`users, roles, permissions, user_roles, role_permissions, departments, audit_logs, zoho_tokens(user_id, app_name, encrypted_refresh_token, iv, auth_tag)` — refresh tokens encrypted at rest, plaintext never on disk.

## Zoho Integration Flow
1. **First click (interactive):** employee → `/oauth/:app/authorize` → Zoho's own login + consent screen → callback validates single-use `state` (CSRF) → exchanges code for `refresh_token` → encrypts & stores it → redirects into the real Zoho web app, already authenticated.
2. **Every later click / API call:** decrypt stored refresh_token → mint fresh access_token → call Zoho REST API directly.

**What this does / doesn't achieve:**
- ✅ No Zoho password ever handled or stored — only an encrypted refresh token per employee.
- ✅ Consent screen shown once only; RBAC checked before any Zoho contact.
- ❌ Doesn't eliminate Zoho's own login screen reappearing once the employee's **Zoho session** (separate from ours) naturally expires — no OAuth token can substitute for an active browser session. Only SAML SSO (federated trust per request) removes that dependency entirely.
- Each employee has a real, individual OAuth grant on Zoho's side — the trade-off for never handling a password.

## Role / Service Mapping
| Role | Users admin | Roles admin | Audit Logs | Zoho CRM | Zoho Desk |
|---|:-:|:-:|:-:|:-:|:-:|
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| SALES | – | – | – | ✓ | – |
| SUPPORT | – | – | – | – | ✓ |

## Setup
```bash
# backend
cd backend && cp .env.example .env   # DB_*, JWT_SECRET, ZOHO_CLIENT_ID/SECRET, TOKEN_ENCRYPTION_KEY
npm install && npm run migrate && npm run seed && npm run dev   # :4000

# frontend
cd frontend && cp .env.example .env  # VITE_API_URL
npm install && npm run dev   # :5173
```
Zoho API Console → **Add Client → Server-based Applications** (not Self Client — that's machine-only, no per-employee consent) → set Redirect URI exactly matching `ZOHO_REDIRECT_URI` → copy Client ID/Secret into `.env`. No admin script needed; each employee self-authorizes on first click.

**Scopes:** `ZohoCRM.modules.contacts.READ`, `Desk.tickets.READ` (read-only, minimum necessary).

**Demo credentials** (password `Password123!` for all): admin@example.com (ADMIN), sales@example.com (SALES), support@example.com (SUPPORT).

## Known Limitations
- **Zoho People / Manager role descoped** — Zoho People API returned `Invalid OAuth Scope` (error 7218) even with the correct scope granted; not resolved in time, so removed rather than shipped broken. Final scope: ADMIN, SALES, SUPPORT.
- **Zoho's login screen can still reappear** once an employee's own Zoho session expires — a hard boundary of any OAuth-token approach; consent isn't re-asked, only sign-in can recur. Only SSO/SAML removes this fully.
- **Per-employee OAuth grant, not fully credential-free** — deliberate trade-off vs. a shared Self Client (which avoids per-employee Zoho records but is API-only and can't land the browser in the real Zoho app) or a reverse-proxy/stored-password approach (rejected: fragile, against Zoho's ToS).
- No password-reset flow; user "delete" is soft (deactivation) to preserve audit-log integrity.
