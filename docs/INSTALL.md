# Installation Guide

## Prerequisites

- Python 3.11+
- Node.js 20+ (Next.js 16 requires Node 20.9+)
- PostgreSQL 14+ (local, or a hosted instance such as Neon)
- Redis 7+ (optional — only needed for Celery background tasks)

## 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Configure environment

Copy the production template and edit values, or create a local `.env`:

```bash
cp .env.production.example .env
```

Minimum local configuration:

```
DEBUG=true
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@localhost:5432/smart_village
DATABASE_URL_SYNC=postgresql://USER:PASSWORD@localhost:5432/smart_village
SECRET_KEY=some-long-random-string
CORS_ORIGINS=http://localhost:3000
```

`DEBUG=true` enables the interactive API docs at `/docs`.

### Create the database and apply migrations

```bash
# create the database once
createdb smart_village        # or via psql: CREATE DATABASE smart_village;

# apply schema + indexes (Alembic)
alembic upgrade head
```

### Seed data (optional, for development)

If a seed script exists under `scripts/` or `seed/`, run it to populate demo users and complaints. Otherwise register a citizen via the UI and promote yourself to admin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

### Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

- Health check: `http://localhost:8000/api/health`
- API docs (dev only): `http://localhost:8000/docs`

### Run the tests

```bash
pytest tests/ -q              # 225 tests
```

## 2. Frontend

```bash
cd frontend
npm install
```

Create `.env.local` pointing at your backend:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the dev server:

```bash
npm run dev
```

Open http://localhost:3000

### Build & lint

```bash
npm run lint                  # 0 errors expected
npm run build                 # production build (type-checked)
```

## 3. Docker (optional, full stack)

Requires Docker + Docker Compose, and a `SECRET_KEY` environment variable:

```bash
cd backend
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')"
docker compose up --build
```

This starts Postgres, Redis, the API (with nginx on port 80), a Celery worker, and Celery beat. Migrations run automatically on container start.

## 4. Configuration Reference

The full list of settings (with defaults) lives in `backend/app/config.py`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Async Postgres connection string (asyncpg) |
| `DATABASE_URL_SYNC` | Sync connection string for Alembic |
| `SECRET_KEY` | JWT signing key — **must be unique & secret in production** |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `RATE_LIMIT_PER_MINUTE` | Global per-IP rate limit |
| `UPLOAD_DIR` | Where uploaded files are stored |
| `STORAGE_BACKEND` | `local` \| `s3` \| `cloudinary` |
| `DEBUG` | Enables `/docs`; keep `false` in production |
