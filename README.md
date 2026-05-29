# SyncTrace

**AI-Powered Academic Traceability Platform**

Automate sequential traceability, continuity verification, and audit reporting for capstone projects. SyncTrace uses LLM-powered analysis (via OpenRouter) to ensure comprehensive alignment between project artifacts and detect gaps with AI-powered recommendations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://www.python.org)
[![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react)](https://react.dev)

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Setup Instructions](#setup-instructions)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)

## 📌 Overview

SyncTrace is a comprehensive academic traceability platform designed to help capstone and software engineering teams:

- **Align artifacts** - Automatically trace relationships between Proposal, SRS, SDD, SPMP, STD, and Source Code
- **Detect gaps** - Identify missing or incomplete traceability links with severity classification
- **Generate insights** - Receive AI-powered root cause analysis and remediation recommendations
- **Create reports** - Export comprehensive audit reports in PDF, JSON, or CSV formats
- **Manage groups** - Faculty advisers can oversee multiple project groups with health dashboards

## 🏗️ Architecture

```
syncctrace/
├── frontend/           # React 19 SPA with Vite + Tailwind CSS v3
├── backend/            # Node.js + Express + Prisma ORM + PostgreSQL
├── ai-service/         # Python FastAPI + ML models for NLP analysis
└── vercel.json         # Monorepo deployment configuration
```

### Data Flow

```
User → Frontend (React) → Backend API (Express) → PostgreSQL (Supabase)
                            ↓
                     OpenRouter (LLM)
                            ↓
              Traceability analysis & gap recommendations
```

Production audits run through **Express + OpenRouter**. The optional `ai-service/` Python microservice provides embedding-based similarity for local or experimental use.

### Deployment

| Component | Vercel project | URL |
|---|---|---|
| Frontend | `syncctrace` | [synctrace.vercel.app](https://synctrace.vercel.app) |
| Backend | `syncctrace-oj9b` | [synctrace-backend.vercel.app](https://synctrace-backend.vercel.app) |
| Database & Auth | Supabase | PostgreSQL + Google OAuth |

## ✨ Key Features

| Feature | Description |
|---|---|
| **Traceability Matrix** | NLP-based semantic similarity scoring between artifact pairs (6 types) |
| **Gap Detection** | Automated identification of missing traceability links with severity levels |
| **AI Recommendations** | LLM-powered root cause analysis and remediation suggestions (OpenRouter) |
| **Faculty Dashboard** | Multi-group project oversight with health metrics and filtering |
| **Real-time Sync** | Live project state updates via React Query polling |
| **Report Generation** | Multi-format exports (PDF, JSON, CSV) with audit trails |
| **Authentication** | Google OAuth via Supabase Auth with role-based access (Student/Faculty) |
| **Artifact Management** | Upload, version, and manage 6 artifact types with metadata |

## 🛠️ Tech Stack

### Core architecture

| Layer | Technology | Function |
|---|---|---|
| **Frontend** | React 19 SPA (Vercel) | Student & faculty UI |
| **Backend** | Express API (Vercel) | REST API, uploads, audits, exports |
| **Database** | PostgreSQL via Supabase | Users, groups, artifacts, audit results |
| **Auth** | Supabase Auth | Google OAuth, sessions, JWT verification |
| **AI audits** | OpenRouter | LLM traceability analysis & gap detection |

### Frontend

| Technology | Function |
|---|---|
| **React 19 + TypeScript** | UI framework and type-safe components |
| **Vite** | Dev server and production bundler |
| **Tailwind CSS v3** | Utility-first styling |
| **PostCSS + Autoprefixer** | CSS processing for Tailwind |
| **React Router v7** | Client-side routing |
| **Zustand** | Global state (auth, user profile, group context) |
| **TanStack React Query** | Server state, caching, audit polling |
| **TanStack React Table** | Data tables (matrix, lists) |
| **Axios** | HTTP client for backend API |
| **React Hook Form** | Form handling |
| **Lucide React** | Icons |
| **Recharts** | Dashboard charts |
| **date-fns** | Date formatting |
| **clsx + tailwind-merge + CVA** | Conditional Tailwind class utilities |
| **jsPDF + jspdf-autotable** | Structured PDF report export |
| **html2canvas** | UI capture for exports |
| **@supabase/supabase-js** | Google OAuth and session management |
| **ESLint + TypeScript ESLint** | Linting |

### Backend

| Technology | Function |
|---|---|
| **Node.js 20+** | Backend runtime |
| **Express.js** | REST API server |
| **TypeScript** | Type-safe backend code |
| **Prisma ORM** | Database schema, queries, migrations |
| **PostgreSQL** | Primary data store (hosted on Supabase) |
| **@supabase/supabase-js** | Verifies user JWTs on protected routes |
| **OpenAI SDK → OpenRouter** | LLM chat completions for audits |
| **@vercel/functions** | Background audit jobs via `waitUntil()` on Vercel |
| **Zod** | Request validation |
| **Multer** | Artifact file uploads |
| **pdf-parse** | Text extraction from PDF artifacts |
| **Mammoth** | Text extraction from Word (`.docx`) artifacts |
| **Helmet** | Security HTTP headers |
| **CORS** | Cross-origin access for the frontend |
| **express-rate-limit** | API rate limiting |
| **dotenv** | Local environment variables |
| **uuid** | Unique ID generation |

### OpenRouter (LLM audits)

SyncTrace sends artifact pairs to [OpenRouter](https://openrouter.ai) using the OpenAI-compatible API at `https://openrouter.ai/api/v1`.

| Setting | Value | Function |
|---|---|---|
| **`OPENROUTER_API_KEY`** | Required | Authenticates audit requests |
| **`OPENROUTER_MODELS`** | Optional, comma-separated | Models tried in order; falls back on 429/502/503 |
| **`OPENROUTER_MODEL`** | Optional, single model | Alias used if `OPENROUTER_MODELS` is not set |

#### Models

| Model ID | When used | Notes |
|---|---|---|
| **`deepseek/deepseek-v4-flash:free`** | **Code default** | Used when no model env var is configured |
| **`openrouter/free`** | **Recommended primary** | OpenRouter free-tier router (see `.env.example`) |
| **`deepseek/deepseek-v4-flash:free`** | **Recommended fallback** | Second choice in `.env.example` |

Recommended configuration:

```env
OPENROUTER_MODELS="openrouter/free,deepseek/deepseek-v4-flash:free"
```

Each audit call sends full upstream and downstream document text and expects structured JSON (`alignmentScore`, `coverageScore`, `evidencePairs`, `gaps`, `summary`) at `temperature: 0.2`.

### AI service (optional)

| Technology | Function |
|---|---|
| **Python 3.11+** | Optional standalone microservice |
| **FastAPI** | Embedding/similarity HTTP API |
| **sentence-transformers** (`all-MiniLM-L6-v2`) | Semantic embedding generation |
| **Uvicorn** | ASGI server |
| **NumPy + Pydantic** | Vector math and request schemas |

> **Note:** Production Vercel deployments use **OpenRouter via Express**, not the Python `ai-service/`.

### DevOps & hosting

| Technology | Function |
|---|---|
| **Vercel** | Hosts frontend and backend monorepo |
| **GitHub** | Source control; pushes trigger deploys |
| **`vercel.json`** | Routes frontend at `/` and backend at `/api` |

### Feature → stack mapping

| Feature | Primary technologies |
|---|---|
| Login / Google OAuth | Supabase Auth, React, Zustand |
| Upload artifacts | React, Multer, pdf-parse, Mammoth |
| Traceability audit | Express, OpenRouter, Prisma |
| Gap analysis UI | React Query, Recharts |
| Faculty dashboard | React, TanStack Table, Prisma |
| PDF / CSV / JSON export | jsPDF, jspdf-autotable, custom export service |
| Role-based access | Supabase JWT → Express middleware → Prisma roles |

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- Python 3.11+ (optional — only for `ai-service/`)
- Supabase project (PostgreSQL + Google OAuth)
- OpenRouter API key

### 1️⃣ Clone & Install

```bash
git clone https://github.com/yourusername/syncctrace.git
cd syncctrace

# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install

# AI Service
cd ../ai-service && python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2️⃣ Configure Environment

Create `.env` files for each service:

**backend/.env** (see `backend/.env.example`)

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
PORT=4000
FRONTEND_URL="http://localhost:5174"
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_MODELS="openrouter/free,deepseek/deepseek-v4-flash:free"
```

**frontend/.env**

```env
VITE_API_URL="http://localhost:4000/api"
VITE_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

**ai-service/.env** (optional)

```env
BACKEND_URL="http://localhost:4000"
EMBEDDING_MODEL="all-MiniLM-L6-v2"
```

### 3️⃣ Setup Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # optional: populate sample data
```

### 4️⃣ Run Services

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:4000
```

**Terminal 3 - AI Service (optional):**
```bash
cd ai-service
source venv/bin/activate
uvicorn main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

### 5️⃣ Demo Access

Open http://localhost:5173 and sign in with Google OAuth:

- **Student Role** → Project Setup → Artifacts → Matrix → Diagnostics → Export
- **Faculty Role** → Faculty Dashboard → Group Details

## 📦 Setup Instructions

### Development Setup

1. **Install dependencies** (see Quick Start above)

2. **Database setup:**
   ```bash
   cd backend
   npx prisma migrate dev --name "initial migration"
   ```

3. **Start dev servers** (see Quick Start, step 4)

### Production Setup

Deploy as a Vercel monorepo using the root `vercel.json`. The frontend and backend are separate Vercel projects connected to the same GitHub repository.

Set environment variables in each Vercel project (see [Environment Variables](#-environment-variables)).

## 🌐 Deployment

### Vercel (Recommended)

The repo uses two Vercel projects:

| Project | Root directory | Domain |
|---|---|---|
| `syncctrace` | `frontend/` | Frontend SPA |
| `syncctrace-oj9b` | `backend/` | `/api` routes |

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root (or link each subdirectory in Vercel dashboard)
vercel --prod
```

Configuration is defined in `vercel.json`, `frontend/vercel.json`, and `backend/vercel.json`.

### Environment Variables (Production)

Set in each Vercel project → **Settings → Environment Variables**:

**Frontend (`syncctrace`)**

```
VITE_API_URL=https://synctrace-backend.vercel.app/api
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Backend (`syncctrace-oj9b`)**

```
DATABASE_URL=your-supabase-postgres-url
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
FRONTEND_URL=https://synctrace.vercel.app
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODELS=openrouter/free,deepseek/deepseek-v4-flash:free
```

## 📂 Project Structure

```
syncctrace/
├── frontend/
│   ├── src/
│   │   ├── components/       # React components (shared, dashboard, export, etc.)
│   │   ├── pages/            # Page components (Login, Dashboard, Setup, etc.)
│   │   ├── services/         # API clients and mock data
│   │   ├── stores/           # Zustand state stores
│   │   ├── types/            # TypeScript interfaces
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and helpers
│   │   ├── App.tsx           # Root component
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── artifacts.ts
│   │   │   ├── projects.ts
│   │   │   ├── users.ts
│   │   │   ├── export.ts
│   │   │   └── audit.ts
│   │   ├── middleware/       # Express middleware
│   │   ├── services/         # Business logic
│   │   └── index.ts          # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Database migrations
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/
│   ├── main.py               # FastAPI app
│   ├── requirements.txt
│   └── .env.example
│
├── vercel.json               # Monorepo deployment config
├── .vercelignore
└── README.md                 # This file
```

## 🔐 Environment Variables

### Backend

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://postgres:...@db....supabase.co:5432/postgres` |
| `SUPABASE_URL` | Supabase project URL | `https://[PROJECT-REF].supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | From Supabase dashboard |
| `FRONTEND_URL` | Frontend origin (OpenRouter referer header) | `https://synctrace.vercel.app` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` |
| `OPENROUTER_MODELS` | Comma-separated LLM models (tried in order) | `openrouter/free,deepseek/deepseek-v4-flash:free` |
| `OPENROUTER_MODEL` | Single model alias (if `OPENROUTER_MODELS` unset) | `deepseek/deepseek-v4-flash:free` |
| `PORT` | Local dev server port | `4000` |

### Frontend

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:4000/api` |
| `VITE_SUPABASE_URL` | Supabase project URL | From Supabase dashboard |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | From Supabase dashboard |

### AI Service (optional)

| Variable | Description | Example |
|---|---|---|
| `BACKEND_URL` | Allowed CORS origin | `http://localhost:4000` |
| `EMBEDDING_MODEL` | HuggingFace model ID | `all-MiniLM-L6-v2` |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- Frontend: ESLint + Prettier
- Backend: Standard Node.js conventions
- AI Service: PEP 8 compliance

### Reporting Issues
Please use GitHub Issues with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

For questions or issues:
- 📧 Email: support@synctraceapp.com
- 💬 GitHub Issues: [Report a bug](https://github.com/yourusername/syncctrace/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/syncctrace/wiki)

---

**Made with ❤️ for academic excellence**
