# Deployment Guide

Recommended production topology:

- **Database** — PostgreSQL on Neon (serverless) or Railway
- **Backend API** — Railway (or any Docker host / Render / Fly.io)
- **Frontend** — Vercel (static + serverless Next.js)
- **Media storage** — Railway volume (default `local`), or S3/Cloudinary for scale
- **Redis + Celery** — optional; add if you enable background tasks

> **Before you go live:** generate a strong `SECRET_KEY`, set `DEBUG=false`, set
> `CORS_ORIGINS` to your real frontend domain, and change the default admin password.

---

## 1. Database (Neon)

1. Create a Neon project → a Postgres connection string like
   `postgresql://neondb_owner:password@ep-xxx.region.aws.neon.tech/smart_village?sslmode=require`.
2. Build the async + sync URLs:
   - `DATABASE_URL=postgresql+asyncpg://neondb_owner:password@ep-xxx.../smart_village?sslmode=require`
   - `DATABASE_URL_SYNC=postgresql://neondb_owner:password@ep-xxx.../smart_village?sslmode=require`
3. Run migrations once (from your machine or a one-off Railway job):

```bash
cd backend
export DATABASE_URL_SYNC="postgresql://..."
alembic upgrade head
```

## 2. Backend (Railway)

1. Push the `backend/` directory to a GitHub repo (or use the Railway CLI).
2. On Railway, create a new service from the repo with:
   - **Root directory**: `backend`
   - **Build**: uses `Dockerfile` (Railway detects it automatically)
3. Add a **volume** mounted at `/app/static` for uploaded files (persistent media).
4. Add environment variables (see `backend/.env.production.example`):

```
DEBUG=false
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://<neon-connection-string>
DATABASE_URL_SYNC=postgresql://<neon-connection-string>
SECRET_KEY=<long random string>
CORS_ORIGINS=https://<your-frontend-domain>
REDIS_URL=redis://...         # only if using Celery
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
RATE_LIMIT_PER_MINUTE=60
```

5. The container runs `alembic upgrade head` automatically on start
   (`docker-entrypoint.sh`), then launches uvicorn with 4 workers.
6. Deploy and confirm the health endpoint: `GET https://<backend-url>/api/health` → `200`.

> **CORS note:** your frontend origin must be in `CORS_ORIGINS`, otherwise
> browser calls to the API will be blocked.

## 3. Frontend (Vercel)

1. Push the `frontend/` directory to a GitHub repo.
2. In Vercel, **Import Project** → select the repo, **Root Directory**: `frontend`.
3. Framework preset: **Next.js** (Vercel auto-detects).
4. Add environment variable:

```
NEXT_PUBLIC_API_URL=https://<your-backend-url>     # e.g. https://smartvillage.up.railway.app
```

5. Deploy. Every deploy runs `npm run build` (type-checked) before publishing.

## 4. DNS / Custom domains

- Point your frontend domain at Vercel and your API subdomain at Railway.
- Keep them on the same parent domain for the cleanest cookie/CORS story
  (e.g. `app.example.com` frontend + `api.example.com` backend).

## 5. Post-deploy checklist

- [ ] `DEBUG=false` — `/docs`, `/redoc`, `/openapi.json` return 404
- [ ] `SECRET_KEY` is a fresh random string (≥ 32 chars)
- [ ] `CORS_ORIGINS` contains only your frontend origin(s)
- [ ] Login as the admin seed account and change the password immediately
- [ ] `GET /api/health` returns 200 from outside your network
- [ ] Uploads persist across deploys (volume mounted)
- [ ] HTTPS enabled on both frontend and API domains
- [ ] Create a **fresh admin account** and deactivate the seed admin, or change its password

## 6. Optional: Celery background tasks

The Celery app lives at `backend/app/tasks/celery_app.py`. If you want
notifications/cleanup/analysis to run asynchronously:

- Add a Railway service: `celery -A app.tasks.celery_app worker --concurrency=4`
- Add a beat service: `celery -A app.tasks.celery_app beat`
- Both need `DATABASE_URL` and `REDIS_URL` (a shared Redis, e.g. Upstash)

Without Celery/Redis, the API still works — background work simply runs
synchronously inside request handlers.
