# Smart Village AI Platform

## AI-Powered Complaint Management System

### Architecture

```
smart-village/
├── backend/          # FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── config.py          # Settings & configuration
│   │   ├── database.py        # SQLAlchemy setup
│   │   ├── models/            # Database models (User, Complaint, Notification, etc.)
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── routers/           # API endpoints
│   │   │   ├── auth.py        # JWT authentication (register, login, refresh)
│   │   │   ├── complaints.py  # CRUD, AI analysis, duplicate check
│   │   │   ├── admin.py       # Admin dashboard, user management
│   │   │   ├── analytics.py   # Analytics, trends, hotspots
│   │   │   ├── chat.py        # AI chat assistant
│   │   │   └── websocket.py   # Real-time notifications
│   │   ├── services/
│   │   │   └── ai_service.py  # All AI modules
│   │   ├── middleware/        # Rate limiting, security headers
│   │   └── utils/             # Auth utilities, file handling
│   ├── requirements.txt
│   └── static/uploads/        # Uploaded images
│
├── frontend/         # Next.js 15 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── citizen/             # Citizen portal
│   │   │   ├── auth/                # Login pages
│   │   │   ├── register/            # Registration
│   │   │   ├── complaints/          # Report, view, track
│   │   │   └── admin/               # Dashboard, complaints, analytics, map, assistant
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Card, etc.
│   │   │   └── layout/              # Navbar, Sidebar, Providers
│   │   ├── contexts/          # AuthContext
│   │   ├── lib/               # API client, utils
│   │   └── hooks/             # Custom hooks
│   └── package.json
│
└── AGENTS.md
```

### How to Run

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API docs: http://localhost:8000/docs

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:3000

### AI Features

| Feature | Description | Endpoint |
|---------|-------------|----------|
| Classification | Categorizes complaints (Road, Water, etc.) | Auto on submit |
| Priority Prediction | Assigns Critical/High/Medium/Low | Auto on submit |
| Duplicate Detection | Jaccard similarity + keyword overlap | POST /api/complaints/check-duplicate |
| Image Analysis | OpenCV computer vision detection | Auto on image upload |
| Summary Generation | Extractive sentence summarization | Auto on submit |
| Department Routing | Maps to Roads/Water/Electricity/etc. | Auto on submit |
| Analytics | Trends, hotspots, performance | GET /api/admin/analytics |
| Chat Assistant | Natural language query interface | POST /api/chat |

### Test Accounts

Register via the app or create directly in the database:
- **Citizen**: Register at /register
- **Admin**: Set role to "admin" in database or register then update

### Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4, Framer Motion, Recharts, Leaflet, shadcn/ui
- **Backend**: FastAPI, SQLAlchemy, SQLite (migrate to PostgreSQL by changing DATABASE_URL)
- **Auth**: JWT tokens (access + refresh), bcrypt password hashing
- **AI**: Rule-based NLP, OpenCV computer vision, scikit-learn
- **Maps**: OpenStreetMap via react-leaflet
- **Real-time**: WebSocket connections
