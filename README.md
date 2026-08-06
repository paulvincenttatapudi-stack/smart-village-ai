# Smart Village AI Platform

An AI-powered complaint management system for smart villages. Citizens report issues (roads, water, electricity, sanitation, healthcare, education), an AI engine classifies, prioritizes, routes, and de-duplicates each complaint, and officials manage resolution through a full admin dashboard with real-time notifications.

## Architecture

```
smart-village/
├── backend/                # FastAPI + async SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── main.py         # App entry point, middleware, router registration
│   │   ├── config.py       # Pydantic-settings configuration (env-driven)
│   │   ├── database.py     # Async engine / session factory
│   │   ├── models/         # SQLAlchemy models (User, Complaint, Notification, ...)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── routers/        # auth, complaints, admin, analytics, chat,
│   │   │                   #   notifications, uploads, users, websocket, metrics, demo
│   │   ├── services/       # auth, complaint, analytics, ai, storage, notification
│   │   ├── middleware/     # logging + security headers
│   │   └── utils/
│   ├── migrations/         # Alembic migrations (schema + indexes)
│   ├── tests/              # 225 pytest tests
│   ├── Dockerfile          # Production image (runs alembic upgrade on start)
│   └── docker-compose.yml  # Postgres + Redis + Backend + Celery + nginx
│
└── frontend/               # Next.js (App Router) + TypeScript + Tailwind CSS
    └── src/
        ├── app/            # /, /citizen, /complaints/*, /admin/*, /auth, /demo
        ├── components/     # shadcn/ui + layout (Navbar, Sidebar)
        ├── contexts/       # AuthContext
        └── lib/            # API client, utils
```

## Feature Highlights

| Feature | Description |
|---------|-------------|
| Complaint submission | Multi-step form with AI analysis, duplicate detection, geolocation, image upload |
| AI classification | Category, priority, department routing, summary generation |
| Duplicate detection | Jaccard similarity + keyword overlap against recent complaints |
| Citizen portal | Track status, view history, receive notifications, upvote |
| Admin dashboard | Analytics, trends, hotspots, department workload, user management |
| Map view | Geo-mapped complaints via OpenStreetMap (Leaflet) |
| AI chat assistant | Natural-language queries about complaints/statistics |
| Real-time notifications | WebSocket push + in-app inbox |
| Demo mode | `/demo` interactive sandbox |

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic, Celery/Redis, JWT, bcrypt, slowapi
- **Frontend**: Next.js, TypeScript, Tailwind CSS, Framer Motion, Recharts, Leaflet, shadcn/ui, Sonner
- **AI**: Rule-based NLP, scikit-learn, OpenCV (image analysis)
- **Deployment**: Docker, Railway (backend), Vercel (frontend)

## Quick Start (Development)

See [docs/INSTALL.md](docs/INSTALL.md) for detailed setup.

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # if present; otherwise set the required vars
alembic upgrade head            # create schema + indexes
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

API health check: `GET http://localhost:8000/api/health`

## Test Accounts (development seed data)

| Role    | Username                | Password  |
|---------|-------------------------|-----------|
| Admin   | admin@smartvillage.gov  | Admin@123 |
| Citizen | rahul@example.com       | User@123  |
| Citizen | priya@example.com       | User@123  |

**Production**: change the default admin password immediately after first login (`PUT /api/auth/change-password`).

## Documentation

- [Installation Guide](docs/INSTALL.md)
- [Deployment Guide (Railway + Vercel + Neon)](docs/DEPLOYMENT.md)
- [API Reference](docs/API_DOCUMENTATION.md)

## Security

- JWT access + rotating refresh tokens (bcrypt-hashed passwords)
- Role-based access control (`citizen` / `admin` / `super_admin`)
- Upload validation (extension allowlist + magic-byte sniffing + size limits)
- Rate limiting, security headers (HSTS, CSP, X-Frame-Options, ...), docs disabled in production
- Set a strong `SECRET_KEY` in production — see `.env.production.example`
