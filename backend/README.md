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

## Scripts

- `npm run dev` — start with nodemon
- `npm start` — start the API
- `npm test` — run the Node.js test suite
- `npm run prisma:generate` — generate Prisma Client
- `npm run prisma:migrate` — create/apply a development migration
- `npm run prisma:deploy` — apply existing migrations in deployment
- `npm run prisma:studio` — open Prisma Studio

`API_PREFIX` can override the default `/api/v1` prefix. CORS allows the origin configured in `FRONTEND_URL` (default `http://localhost:5173`).
