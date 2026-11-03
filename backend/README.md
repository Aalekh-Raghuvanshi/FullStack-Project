# MediCore AI backend

Node.js and Express API foundation with Prisma ORM and Supabase PostgreSQL support. The backend uses CommonJS modules.

## Setup

Requires Node.js 20.19+ and npm. From this directory:

```sh
npm install
cp .env.example .env
# Edit .env with your Supabase database connection strings.
npm run prisma:generate
npm run dev
```

The liveness endpoint is `GET http://localhost:3000/health` (also available as `/api/v1/health`). It reports application status without contacting PostgreSQL. Database readiness is reported by `GET /ready` and `/api/v1/ready`; it returns HTTP 200 when Prisma can query the database and HTTP 503 when it cannot. The readiness response intentionally does not return credentials or raw database errors.

## Supabase connection strings

In the Supabase project dashboard, open **Project Settings → Database → Connection string**. Put the transaction pooler URL (usually port `6543`) in `DATABASE_URL` for application queries. For Prisma's direct database operations, put the direct connection URL (usually port `5432`) in `DIRECT_URL`. Keep the real project reference, password, and host only in the ignored local `.env`; never commit that file or expose these values to browser code. URL encode special characters in the database password. The exact host and options depend on the project's Supabase connection details; `.env.example` contains placeholders only.

Apply schema migrations in development with `npm run prisma:migrate`, deploy committed migrations with `npm run prisma:deploy`, and regenerate the client with `npm run prisma:generate`. `prisma migrate dev` needs a reachable direct connection and may require a shadow database depending on database permissions/configuration.

## Authentication setup

Set `JWT_SECRET` in the ignored local `.env` to a unique random value with at least 32 bytes. Generate one with `openssl rand -base64 48`; the `CHANGE_ME` template value is deliberately rejected by the API. Access tokens are signed with HS256, include issuer and audience claims, and expire after 15 minutes by default. `JWT_ACCESS_TOKEN_TTL_SECONDS` may be set from 300 to 3600 seconds. Keep this server-side value out of Vite `VITE_*` variables and frontend files.

Passwords must be 12–72 UTF-8 bytes and are hashed with bcrypt work factor 12 by default. `BCRYPT_ROUNDS` can be tuned between 10 and 15 after measuring production latency. Public registration accepts only `email`, `name`, and `password`; every new account receives `PATIENT`, and any supplied `role` is rejected. Login returns a bearer token and the public user profile, never the password hash. Unknown email and wrong password return the same error. Registration/login share a per-process limit of 10 requests per IP per 15 minutes.

### Routes

- `POST /api/v1/auth/register` — create a patient account and linked patient record
- `POST /api/v1/auth/login` — authenticate and issue a 15-minute access token
- `GET /api/v1/auth/me` — return the active authenticated user's public profile
- `POST /api/v1/auth/logout` — revoke the current token immediately
- `GET /api/v1/patients` and `GET /api/v1/patients/:patientId` — list or view patient records within the caller's access scope
- `POST /api/v1/patients` — create a patient record (ADMIN or RECEPTIONIST)
- `PATCH /api/v1/patients/:patientId` — update demographics (ADMIN/RECEPTIONIST) or own contact details (PATIENT)
- `DELETE /api/v1/patients/:patientId` — deactivate a patient record (soft delete; ADMIN or RECEPTIONIST)
- `GET /api/v1/doctors` and `GET /api/v1/doctors/:doctorId` — list or view active doctor directory records
- `POST /api/v1/doctors` — create a doctor record (ADMIN)
- `PATCH /api/v1/doctors/:doctorId` — update or reactivate a doctor record (ADMIN)
- `DELETE /api/v1/doctors/:doctorId` — deactivate a doctor record (soft delete; ADMIN)
- `GET /api/v1/admin/users` — list users (supports `take` and `skip`)
- `PATCH /api/v1/admin/users/:userId/role` — assign a role (ADMIN only)
- `PATCH /api/v1/admin/users/:userId/status` — activate or deactivate an account (ADMIN only)
- `POST /api/v1/admin/patient-access` and `DELETE /api/v1/admin/patient-access/:accessId` — grant/revoke doctor or nurse access to a patient profile (ADMIN only)

Send tokens as `Authorization: Bearer <accessToken>`. There is no refresh-token endpoint. Logout stores the token ID in `RevokedToken`; protected requests check revocation and fetch the user's current role and active status from PostgreSQL. Schedule `npm run auth:cleanup-revoked` periodically to remove expired revocation rows.

### Role and record access

- **ADMIN:** list users, change roles and account status, and grant/revoke explicit clinical access. An initial administrator is created only by the one-time `npm run auth:bootstrap-admin` command when no administrator exists; set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` in the local backend `.env`, run it, then remove those values. Public registration cannot create administrators.
- **DOCTOR / NURSE:** may list or read patient demographics only when an administrator has granted a `PatientAccess` relationship. They cannot change demographics through these routes.
- **RECEPTIONIST:** may list, create, update, and deactivate patient registration records; cannot manage doctors or change patient account roles.
- **PATIENT:** may list/read only the record linked to their own account and update only their phone, email, address, and emergency contact. Requests for another patient's record return 404 to avoid revealing whether it exists.
- **Doctor records:** authenticated roles can read active directory entries; only ADMIN can create, update, link accounts, or deactivate doctors. A linked account must be an active `DOCTOR` user.

Patient and doctor list endpoints accept `page` (default 1), `limit` (default 20, maximum 100), and `search`. Patient lists also accept `gender`; doctor lists accept `department`, `specialization`, and `availability`. Only ADMIN can request inactive records with `isActive=false`. Responses include pagination totals. `Patient.gender` is an optional free-form label (maximum 80 characters), not a database enum, so the demo can support new self-described values without a schema migration. Patient/doctor numbers are generated by the server and are unique. Patient and doctor account links are optional and unique; linked profile names and email addresses are synchronized with their login accounts.

DELETE operations only set `isActive=false`; they never physically delete patient or doctor rows. This preserves stable identifiers and avoids unsafe cascades when appointments, admissions, invoices, or laboratory orders are added. The current schema has no such workflow models yet; their future endpoints must enforce ownership and patient/clinician relationships in the backend. The `AuditLog` foundation records registration, login outcomes, logout, role/status changes, patient-access changes, and patient/doctor record activity without storing passwords, JWTs, or medical notes.

## Scripts

- `npm run dev` — start with nodemon
- `npm start` — start the API
- `npm test` — run the Node.js test suite
- `npm run prisma:generate` — generate Prisma Client
- `npm run prisma:migrate` — create/apply a development migration
- `npm run prisma:deploy` — apply existing migrations in deployment
- `npm run prisma:studio` — open Prisma Studio
- `npm run auth:bootstrap-admin` — create the initial administrator once
- `npm run auth:cleanup-revoked` — remove expired token revocation records

`API_PREFIX` can override the default `/api/v1` prefix. CORS allows the origin configured in `FRONTEND_URL` (default `http://localhost:5173`).
