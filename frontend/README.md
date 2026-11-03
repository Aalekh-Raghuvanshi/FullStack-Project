# MediCore AI frontend

React, JavaScript, Vite, Tailwind CSS 4, React Router, and Axios client for the MediCore AI authentication, patient, doctor, and appointment APIs.

## Start locally

Requires Node.js 20.19+ and npm. Start the backend first using the instructions in `../backend/README.md`; it must be configured with a reachable database and a server-side `JWT_SECRET`.

From this directory:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Vite prints the local address after startup. `VITE_API_BASE_URL` is a browser-visible API base URL and defaults to `http://localhost:3000/api/v1`. Set it in `.env.local` when the API is hosted elsewhere. Ensure the backend `FRONTEND_URL` allows the frontend origin.

## Authentication and security

Login returns a bearer access token from the current backend. The frontend keeps it in `sessionStorage` so a reload in the same tab can restore the session and asks `/auth/me` to validate it. The shared Axios interceptor attaches the token and clears the local session after an authenticated request returns 401. A 403 is shown as an authorization error without treating the user as signed out. Logout calls the backend revocation endpoint.

`sessionStorage` is accessible to JavaScript running in the page, so a successful cross-site scripting attack could read the token. It is scoped to the tab and cleared when that tab’s session ends, but it is not equivalent to an HttpOnly, Secure, SameSite cookie. A server-managed cookie session would reduce token exposure and is preferred if the backend adds that capability. Never put database credentials, service keys, or JWT signing secrets in Vite variables or frontend source; `VITE_*` values are public in the built bundle. Client role-aware navigation only improves usability: API authorization is enforced by the backend.

Public registration creates a PATIENT account. Staff accounts and roles must be provisioned through the backend administrator workflow.

## Features

- Protected application routes, authenticated user context, role-aware navigation, session expiry, and logout
- Searchable and paginated patient records with details and role-appropriate create/edit forms
- Doctor directory search and provider availability details
- Appointment status/date filters, booking, details, cancellation, and rescheduling
- Shared API services and Axios token/error handling; screens render request errors rather than substituting demo records

## Scripts

- `npm run dev` — start Vite development server
- `npm run build` — create production assets in `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — lint JavaScript and JSX files

No frontend test framework is currently configured.
