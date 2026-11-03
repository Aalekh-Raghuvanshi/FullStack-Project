# MediCore AI frontend

React, JavaScript, Vite, Tailwind CSS 4, and React Router dashboard foundation.

## Start locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

Vite prints the local address after the dev server starts. `VITE_API_BASE_URL` is a browser-visible API base URL and defaults to `http://localhost:3000/api/v1`. Vite environment variables are included in the client bundle, so this file must contain public configuration only. Do not add database URLs/passwords, Supabase service-role keys, private JWT secrets, or webhook signing secrets.

The initial pages are dashboard previews and module placeholders. Authentication and business API operations are not implemented yet.

## Scripts

- `npm run dev` — start the Vite development server
- `npm run build` — build static production assets into `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — lint JavaScript and JSX files
