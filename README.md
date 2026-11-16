# Kheponastro — Ballistix Numerical Laboratory

> A high-performance hybrid web application fusing a tactical gaming interface with a robust Python numerical computation and ballistics backend engine.

---

## 🎯 Executive Summary

**Kheponastro** (codename: `ballistix-numlab`) is a full-stack application that combines:

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + Framer Motion — tactical UI with cinematic transitions
- **Backend**: FastAPI + Uvicorn + NumPy — high-speed numerical solvers for ballistics & optimization
- **Architecture**: Decoupled client-server running in a unified monorepo

| Service | Port | Purpose |
|---------|------|---------|
| Next.js Frontend | `3000` | Interactive tactical interface, animations, HUD |
| FastAPI Backend | `8000` | Numerical engines, ballistics solvers, API |

---

## 📦 Current Progress

### ✅ Completed
- **Frontend Core**: Next.js App Router + Tailwind CSS with custom tactical branding (`Tank-K` & `Scope-O` fonts)
- **Cinematic Transition System**: `CombatTransition.tsx` — Framer Motion powered overlay with dual missile launch animations, crosshair HUD tracking, full-screen scope zoom
- **Backend Bridge**: FastAPI structure in `api/` with health telemetry (`GET /api/py/health`)
- **Numerical Foundation**: Project structure for NumPy solvers with Pydantic validation
- **Dev Environment**: Unified `npm run dev` via `concurrently` running both servers

### 🔄 In Progress / Planned
See [Roadmap & Milestones](#-roadmap--milestones) below.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOREPO ROOT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌────────────────────────────┐   │
│  │  NEXT.JS FRONTEND │◄──────►│      FASTAPI BACKEND        │   │
│  │  (Port 3000)      │  API    │      (Port 8000)            │   │
│  ├──────────────────┤  Calls   ├────────────────────────────┤   │
│  │ • App Router      │         │ • Uvicorn ASGI Server       │   │
│  │ • React 19        │         │ • Pydantic Validation       │   │
│  │ • Tailwind CSS    │         │ • NumPy Numerical Engine    │   │
│  │ • Framer Motion   │         │ • Ballistics Solvers        │   │
│  │ • Lucide React    │         │                             │   │
│  └──────────────────┘         └────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    SHARED ASSETS                          │   │
│  │  public/images/  •  Branding  •  Static Imagery           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Frontend** renders tactical UI, handles user interactions
2. **User actions** trigger API calls to FastAPI endpoints
3. **Backend** validates payloads (Pydantic), runs NumPy solvers
4. **Results** returned as JSON → Frontend updates HUD/simulation state

---

## 🛠 Technology Stack

| Layer | Technologies | Purpose |
|-------|--------------|---------|
| **Frontend UI** | Next.js 16 (App Router), React 19, Tailwind CSS 4 | Fast SSR + client reactive state |
| **Animation & HUD** | Framer Motion, Lucide React | Smooth layout scaling, tactical overlays |
| **Backend API** | FastAPI, Uvicorn, Pydantic | Async routing, payload validation |
| **Numerical Engine** | NumPy | Matrix ops, ballistics solvers |
| **Dev Tooling** | TypeScript, ESLint, concurrently | Type safety, linting, parallel dev servers |

---

## 🚀 Quick Start (From Scratch)

### Prerequisites
- **Node.js** 18+ & npm
- **Python** 3.11+ (system provides `python3`)

### 1. Clone & Install Frontend
```bash
git clone <repo-url>
cd ballistix-numlab
npm install
```

### 2. Setup Python Backend Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
# Linux/macOS:
source venv/bin/activate
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```

### 3. Run Development Servers

**Option A: Unified (recommended)**
```bash
npm run dev
```
Runs both Next.js (port 3000) and FastAPI (port 8000) via `concurrently`.

**Option B: Separate terminals**
```bash
# Terminal 1 - Frontend
npm run next-dev

# Terminal 2 - Backend (with venv activated)
./venv/bin/python -m uvicorn api.index:app --reload --port 8000
```

### 4. Verify
- **Frontend**: http://localhost:3000
- **Backend Health**: http://localhost:8000/api/py/health
- **API Docs (Swagger)**: http://localhost:8000/api/py/docs

---

## 📁 Project Structure

```
ballistix-numlab/
├── api/                          # FastAPI Backend
│   ├── index.py                  # App entry, routes, CORS
│   └── solvers/
│       ├── __init__.py
│       └── engine.py             # Numerical solvers (NumPy)
├── public/
│   └── images/                   # Static branding assets
├── src/
│   ├── app/                      # Next.js App Router pages
│   ├── components/               # React components
│   │   └── CombatTransition.tsx  # Cinematic transition overlay
│   └── lib/                      # Utilities, hooks
├── package.json                  # Frontend deps + dev scripts
├── requirements.txt              # Python deps
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind config
└── next.config.ts                # Next.js config
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/py/health` | Service health + solver registry |
| `POST` | `/api/py/optimize-ordnance` | 0/1 Knapsack for ordnance selection |
| `POST` | `/api/py/simulate-trajectory` | RK4 projectile simulation |

### Example: Health Check
```bash
curl http://localhost:8000/api/py/health
```
```json
{
  "status": "ONLINE",
  "engine": "Python FastAPI + NumPy",
  "solvers_ready": [
    "Bisection", "False Position", "Newton-Raphson",
    "Gauss Elimination", "Gauss-Jordan", "Euler",
    "Modified Euler", "RK4", "0/1 Knapsack"
  ]
}
```

---

## 🗺 Roadmap & Milestones

### Phase 1: Audio & Immersion (Immediate)
- [ ] **Web Audio API Integration**
  - Synthesized missile launch hum during transition
  - Explosion feedback on transition complete
  - Spatial audio for HUD elements
- [ ] **Loading Progress → Canvas Hook**
  - Connect progress bar to Three.js canvas initialization
  - Stream simulation state into transition overlay

### Phase 2: Numerical Solvers — Core Physics
Populate `api/solvers/engine.py` with production-ready implementations:

| Solver | Status | Priority |
|--------|--------|----------|
| Bisection Method | 🟡 Stubbed | High |
| False Position | 🟡 Stubbed | High |
| Newton-Raphson | 🟡 Stubbed | High |
| Gauss Elimination | 🟡 Stubbed | Medium |
| Gauss-Jordan | 🟡 Stubbed | Medium |
| Euler Method | 🟡 Stubbed | Medium |
| Modified Euler | 🟡 Stubbed | Medium |
| RK4 Projectile | 🟡 Stubbed | **Critical** |
| 0/1 Knapsack | 🟡 Stubbed | **Critical** |

**Required for each:**
- Vectorized NumPy implementation
- Input validation (Pydantic models)
- Unit tests (`pytest`)
- API endpoint with OpenAPI docs

### Phase 3: Ballistics Physics Engine
- [ ] Drag coefficient models (G1, G7, custom)
- [ ] Trajectory loops with wind/Coriolis
- [ ] Muzzle velocity → downrange energy tables
- [ ] Ballistic calculator UI component

### Phase 4: Tactical Features
- [ ] Ordnance loadout optimizer (knapsack + constraints)
- [ ] Range card generator (PDF export)
- [ ] Multi-target engagement planner
- [ ] Replay system with timeline scrubber

### Phase 5: Production Hardening
- [ ] Docker multi-stage build (Node + Python)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] API rate limiting & auth (JWT)
- [ ] Monitoring / health dashboards
- [ ] E2E tests (Playwright)

---

## 🧪 Development Commands

```bash
# Frontend
npm run dev          # Unified dev (Next.js + FastAPI)
npm run next-dev     # Next.js only
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint

# Backend (with venv activated)
./venv/bin/python -m uvicorn api.index:app --reload --port 8000
./venv/bin/pytest                # Run tests (when added)
./venv/bin/python -m api.solvers.engine  # Quick solver test
```

---

## 📝 Environment Variables

Create `.env.local` in root for frontend:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend uses `api/index.py` defaults — configurable via environment if needed.

---

## 🤝 Contributing

1. **Branch**: `feature/<solver-name>` or `fix/<issue>`
2. **Commit**: Conventional commits (`feat:`, `fix:`, `refactor:`)
3. **PR**: Target `main` — include solver validation + test results
4. **Review**: Numerical accuracy verified before merge

---

## 📄 License

Proprietary — Internal use only.

---

## 🔗 Quick Links

- [Next.js Docs](https://nextjs.org/docs) — App Router reference
- [FastAPI Docs](https://fastapi.tiangolo.com) — API development
- [NumPy Reference](https://numpy.org/doc/) — Numerical computing
- [Framer Motion](https://www.framer.com/motion/) — Animations
- [Tailwind CSS](https://tailwindcss.com/docs) — Styling

---

*Built with tactical precision. 🎯*