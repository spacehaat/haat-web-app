# Spacehaat — Web App

React + Vite command center for brokers and admins.

**Deploy independently** to Vercel, Netlify, CloudFront/S3, or Docker.

Depends on shared packages in `packages/` (monorepo).

## Local development

From **repo root**:

```bash
npm install
npm run dev:web
```

Open `http://localhost:5173` — API proxied to `http://localhost:8080`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `VITE_API_URL` | *(empty)* | Leave empty in dev (Vite proxy). Set to API URL in production. |

Create `apps/web/.env.production`:

```
VITE_API_URL=https://api.spacehaat.in
```

## Docker

Build from **repository root**:

```bash
docker build -f apps/web/Dockerfile -t spacehaat-web .
docker run -p 8081:80 spacehaat-web
```

## Deploy targets

| Platform | Root directory | Build command | Output |
|----------|----------------|---------------|--------|
| **Vercel** | `apps/web` | `npm run build` | `dist` |
| **Netlify** | `apps/web` | `npm run build` | `dist` |
| **S3 + CloudFront** | — | `npm run build:web` at root | upload `apps/web/dist` |

Install command at repo root: `npm install` (workspaces resolve `@spacehaat/api-client`).

## API

Requires `apps/backend` running. Set CORS on the backend to allow this app's origin.
