# SyncTrace

AI-powered project continuity and traceability assistant for academic capstone projects.

## Architecture

```
syncctrace/
├── frontend/      # React 19 + TypeScript + Vite + Tailwind CSS v3
├── backend/       # Node.js + Express + Prisma + PostgreSQL
└── ai-service/    # Python FastAPI + sentence-transformers
```

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma migrate dev
npm run dev        # http://localhost:4000
```

### AI Service
```bash
cd ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

## Demo Login

Open http://localhost:5173 and click **Sign in with Google** using either:
- **Student** role → Project Setup → Artifacts → Matrix → Diagnostics → Export
- **Adviser (Faculty)** role → Faculty Dashboard → Group Detail

> No real Google OAuth is required in demo mode — the login is simulated.

## Key Features

| Feature | Description |
|---|---|
| Traceability Matrix | NLP-based alignment scoring between 6 artifact types |
| Gap Detection | Severity-classified gaps with AI root cause + recommendations |
| Faculty Dashboard | Multi-group overview with health scores and filters |
| Export | PDF / JSON / CSV report generation |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v3, Zustand, React Router v7 |
| Backend | Node.js, Express, Prisma ORM, PostgreSQL, JWT |
| AI Service | Python 3.11, FastAPI, sentence-transformers (all-MiniLM-L6-v2) |
