# SyncTrace

**AI-Powered Academic Traceability Platform**

Automate sequential traceability, continuity verification, and audit reporting for capstone projects. SyncTrace uses advanced NLP and machine learning to ensure comprehensive alignment between project artifacts and detect gaps with AI-powered recommendations.

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
User → Frontend (React) → Backend API (Express) → Database (PostgreSQL)
                            ↓
                        AI Service (Python)
                            ↓
                    NLP Analysis & Recommendations
```

## ✨ Key Features

| Feature | Description |
|---|---|
| **Traceability Matrix** | NLP-based semantic similarity scoring between artifact pairs (6 types) |
| **Gap Detection** | Automated identification of missing traceability links with severity levels |
| **AI Recommendations** | Machine learning-powered root cause analysis and remediation suggestions |
| **Faculty Dashboard** | Multi-group project oversight with health metrics and filtering |
| **Real-time Sync** | Live project state updates using WebSocket/polling |
| **Report Generation** | Multi-format exports (PDF, JSON, CSV) with audit trails |
| **Authentication** | Google OAuth 2.0 with role-based access control (Student/Faculty) |
| **Artifact Management** | Upload, version, and manage 6 artifact types with metadata |

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS v3, class-variance-authority
- **State**: Zustand
- **Router**: React Router v7
- **HTTP**: Axios + TanStack Query
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Charts**: Recharts
- **Export**: html2canvas, jsPDF

### Backend
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT + Google OAuth
- **Security**: bcryptjs, Helmet, CORS, Rate Limiting
- **PDF Processing**: mammoth
- **API Docs**: Auto-generated from routes

### AI Service
- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **NLP**: sentence-transformers (all-MiniLM-L6-v2)
- **Async**: uvicorn
- **Utilities**: python-dotenv

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- Python 3.11+
- PostgreSQL 15+
- Google OAuth credentials

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

**backend/.env**
```
DATABASE_URL="postgresql://user:password@localhost:5432/syncctrace"
JWT_SECRET="your-super-secret-jwt-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OPENAI_API_KEY="your-openai-key"
OPENROUTER_API_KEY="your-openrouter-key"
```

**ai-service/.env**
```
PYTHONUNBUFFERED=1
MODEL_NAME="all-MiniLM-L6-v2"
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

**Terminal 3 - AI Service:**
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

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete deployment instructions.

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy monorepo
vercel --prod

# View logs
vercel logs syncctrace --prod
```

Configuration: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### Environment Variables (Production)

Set in Vercel dashboard → Settings → Environment Variables:

```
VITE_API_URL=https://your-domain.vercel.app/api
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
DATABASE_URL=your-production-database-url
OPENAI_API_KEY=your-api-key
OPENROUTER_API_KEY=your-api-key
JWT_SECRET=your-production-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
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
├── VERCEL_DEPLOYMENT.md      # Deployment guide
└── README.md                 # This file
```

## 🔐 Environment Variables

### Backend

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/syncctrace` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-key` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | From Google Cloud Console |
| `OPENAI_API_KEY` | OpenAI API key | sk-... |
| `OPENROUTER_API_KEY` | OpenRouter API key | For LLM routing |

### Frontend

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:4000/api` |
| `VITE_SUPABASE_URL` | Supabase project URL | From Supabase dashboard |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | From Supabase dashboard |

### AI Service

| Variable | Description | Example |
|---|---|---|
| `PYTHONUNBUFFERED` | Unbuffered output | `1` |
| `MODEL_NAME` | HuggingFace model ID | `all-MiniLM-L6-v2` |

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
