# Spacehaat — Web App (standalone repo)

React + Vite command center for brokers and admins.

**GitHub:** [spacehaat/haat-web-app](https://github.com/spacehaat/haat-web-app)  
**Deploy:** Vercel, Netlify, Docker

This repo is **self-contained**. Shared code is vendored in `packages/` inside this repo (not a parent monorepo).

Related repos:
- Backend → [spacehaat/haat-backend](https://github.com/spacehaat/haat-backend)
- Mobile → [spacehaat/haat-mobile-app](https://github.com/spacehaat/haat-mobile-app)

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — in dev, `/api` is proxied to `http://localhost:8080` (run backend separately).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |

## Environment

| Variable | When | Value |
|----------|------|--------|
| `VITE_API_URL` | Production build | `https://haat-backend.onrender.com` |

Copy `.env.example` → `.env.production` for local production builds.

**Vercel (recommended):**

1. **Environment variable:** `VITE_API_URL` = `https://haat-backend.onrender.com` (all environments)
2. **Redeploy** after adding the variable (required — Vite bakes it at build time)
3. **Fallback:** `vercel.json` also proxies `/api/*` → Render if the env var is missing

**Backend CORS** on Render must include your Vercel URL:

```env
CORS_ORIGIN=https://haat-web-app.vercel.app,http://localhost:5173
```

## Docker

```bash
docker build -t spacehaat-web .
docker run -p 8081:80 spacehaat-web
```

## API

Requires the backend API running. Set backend `CORS_ORIGIN` to include this app's URL.
