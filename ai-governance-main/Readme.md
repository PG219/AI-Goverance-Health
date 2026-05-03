# Rakfort AI Governance Platform

Welcome to the documentation for the Rakfort AI Governance Platform. This solution provides a comprehensive, unified control plane for managing your organization's AI risk, compliance, and trust.

Our platform empowers you to operationalize AI governance by providing real-time visibility and automated workflows, enabling you to build, deploy, and manage AI systems responsibly and in compliance with global regulations.

https://governance.rakfort.com

---

## Core Platform Features

The Rakfort AI Governance Platform is built around a central dashboard that provides access to all critical governance functions.

### 1. The AI Governance Dashboard 
This is the central hub for your entire AI governance program. It provides a single-pane-of-glass view of all your AI assets, their risk posture, and their compliance status.

* **Key Capabilities:**
    * Unified AI Asset Inventory (View all models in one place).
    * Real-time risk posture and threat monitoring.
    * Compliance status tracking against frameworks like **NIST AI RMF**, **ISO 42001**, and **EU AI Act**.

![alt text](<assets/Dashboard.png>)

---

### 2. AI Risk Assessment
A dedicated module for moving from static spreadsheets to a dynamic, continuous risk management process.

* **Key Capabilities:**
    * Automated workflows for identifying and assessing AI-specific risks.
    * A comprehensive risk register to track risks throughout the AI lifecycle.
    * Tools for prioritizing risks and managing mitigation tasks.

![alt text](<assets/Risk Assessment.png>)

---

### 3. Control Assessment
Manage your AI-related controls seamlessly. This module allows you to map your internal controls to multiple, overlapping regulatory frameworks and automate the evidence collection process.

* **Key Capabilities:**
    * A centralized library of pre-built and custom controls.
    * Map a single control to multiple frameworks ("test once, report many").
    * Automate evidence collection and streamline audit readiness.

![alt text](<assets/Control Assessment.png>)

---

### 4. The Trust Center
Build and maintain trust with your customers, partners, and regulators. The Trust Center is a customizable, public-facing portal to transparently communicate your AI's security, compliance, and ethical posture.

* **Key Capabilities:**
    * A single source of truth for all compliance and security documentation.
    * Securely share audit reports, certifications, and policies.
    * **Built-in Chatbot:** Features an integrated, AI-powered chatbot to provide instant, verified answers to stakeholder questions about your governance practices.

![alt text](<assets/Trust Center.png>)

---

## See It in Action

The best way to understand the power of the Rakfort AI Governance Platform is to see it live.

* **Demo Account: Use below details:** https://governance.rakfort.com
  
Username: demo@rakfort.com; Password: governance.demo@Rakfort

* **Request a Demo:** Visit our [Demo Page](https://governance.rakfort.com/demo) (or your specific demo link) to schedule a personalized walkthrough with our team.

![alt text](<assets/Demo Page.png>)

---

## Local Development Setup

This section covers running the entire platform on your own machine.

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 18+ | Backend (Express) and frontend (Vite) |
| **Python** | 3.11 (recommended) | The AI agent. Python 3.14 has wheel compatibility issues with several deps. |
| **MongoDB** | 7+ | Local install (`winget install MongoDB.Server`) or Atlassian/Atlas connection string |
| **npm** | 9+ | Comes with Node |

### Repository Layout

```
ai-governance-main/
├── backend/           # Node.js Express API (port 3001) — auth, projects, requirements CRUD
│   ├── routes/        # REST endpoints (auth, requirements, projects, etc.)
│   ├── models/        # Mongoose schemas
│   ├── server.js      # Entry point
│   ├── .env           # Backend secrets (gitignored)
│   └── Agents/        # Python FastAPI AI agent (port 8000)
│       ├── main.py    # Agent entry point
│       ├── agents/    # Individual agents (chat, collection, risk-matrix, etc.)
│       ├── .venv/     # Python virtualenv (gitignored)
│       └── .env       # Agent secrets (gitignored)
└── frontend/          # React + Vite (port 5173)
    └── .env           # Frontend env vars (gitignored)
```

### Where API Keys Live

All `.env` files are **gitignored** — they never get pushed. Copy from the matching `env.example` and fill in your values.

#### `backend/.env`
Copy from `backend/env.example`. Required keys:

```bash
MONGODB_URI=mongodb://localhost:27017/governance
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=<random_string_at_least_32_chars>
SESSION_SECRET=<random_string>
AGENT_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Optional — only if using Google login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Optional — only if using email features
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

#### `backend/Agents/.env`
Copy from `backend/Agents/env.example`. Required keys:

```bash
# AI provider (the chat/collection/risk-matrix agents)
GOOGLE_API_KEY=<get_one_at_https://aistudio.google.com/apikey>
# OR alternatively (only if codebase is configured for OpenAI):
# OPENAI_API_KEY=<get_one_at_https://platform.openai.com/api-keys>

# Database (same Mongo as backend)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=AI-Governance

# Atlassian — for Jira & Confluence integrations (Collection page → Integrations tab)
ATLASSIAN_URL=https://yoursite.atlassian.net
ATLASSIAN_EMAIL=your_email@example.com
ATLASSIAN_API_TOKEN=<create_at_https://id.atlassian.com/manage-profile/security/api-tokens>

# Optional — RAG / vector search
QDRANT_PATH=./qdrant_data
RAG_COLLECTION=rag_docs
```

##### How to get the keys

| Key | Where to create | Notes |
|---|---|---|
| `GOOGLE_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Free tier, no card needed |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Paid (or free trial credit) |
| `ATLASSIAN_API_TOKEN` | [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) | Click "Create API token", copy the long string immediately (you can't see it again) |

#### `frontend/.env`
Copy from `frontend/env.example`. Just two values:

```bash
VITE_BACKEND_URL=http://localhost:3001
VITE_AGENT_URL=http://localhost:8000
```

### Installation

Open a terminal and run these in order:

```powershell
# 1. Install backend Node deps
cd backend
npm install

# 2. Install frontend Node deps
cd ../frontend
npm install

# 3. Create Python venv and install agent deps
cd ../backend/Agents
python -m venv .venv
.\.venv\Scripts\activate           # Windows
# source .venv/bin/activate         # macOS/Linux
pip install -r requirements.txt

# 4. (one-time) Create the demo user — from backend/, with the backend already running
cd ..
node createDemoUser.js
```

> **Note:** `requirements.txt` is incomplete in some repo states. If `pip install` fails or you get import errors at startup, install these manually:
> ```
> pip install fastapi "uvicorn[standard]" pydantic python-dotenv pandas openpyxl pymongo openai langchain-openai langchain-google-genai langgraph langchain-community langchain-text-splitters langchain-core qdrant-client tiktoken atlassian-python-api mcp pypdf python-multipart tabulate rich
> ```

### Running the App (3 terminals)

| Terminal | Command | Port |
|---|---|---|
| **1 — Backend** | `cd backend && npm run dev` (or `node server.js`) | 3001 |
| **2 — Agent** | `cd backend/Agents && .\.venv\Scripts\python.exe main.py` | 8000 |
| **3 — Frontend** | `cd frontend && npm run dev` | 5173 |

> **Windows tip:** if you prefer `python main.py`, make sure the venv is activated first (`.\.venv\Scripts\activate`). Otherwise call the venv's python directly.

Then open: **http://localhost:5173/**

Login with the demo account:
- Email: `demo@rakfort.com`
- Password: `governance.demo@Rakfort`

### Verifying It Works

```bash
# Frontend
curl http://localhost:5173/                            # → HTTP 200

# Backend
curl http://localhost:3001/                            # → {"status":"running"}

# Agent
curl http://localhost:8000/                            # → {"version":"2.0.0"}

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@rakfort.com","password":"governance.demo@Rakfort"}'

# Jira sync (after Atlassian creds set)
curl http://localhost:8000/agent/integrations/jira

# Confluence sync (after Atlassian creds set)
curl "http://localhost:8000/agent/integrations/confluence/mcp?query=requirements"
```

### Features That Need Extra Setup

| Feature | What's needed |
|---|---|
| **Email/password login** | Just `JWT_SECRET` in `backend/.env` |
| **Google login** | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `backend/.env` (create at [console.cloud.google.com](https://console.cloud.google.com)) |
| **Chat Agent (questionnaire)** | Nothing — works out of the box |
| **Collection chat (extract requirements)** | `GOOGLE_API_KEY` (or `OPENAI_API_KEY` if swapped) in `backend/Agents/.env` |
| **Document upload extraction** | Same as Collection chat |
| **Risk Matrix** | `OPENAI_API_KEY` in `backend/Agents/.env` |
| **Jira/Confluence integrations** | `ATLASSIAN_URL` + `ATLASSIAN_EMAIL` + `ATLASSIAN_API_TOKEN` in `backend/Agents/.env` |
| **Trust Center RAG** | `GOOGLE_API_KEY` + Qdrant + (optional) GCS bucket |

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| **"Login failed"** | Backend not running, or MongoDB not reachable on `27017` |
| **"Sorry, I encountered an error"** in Collection chat | Agent not running on `8000`, or `GOOGLE_API_KEY` / `OPENAI_API_KEY` missing |
| **Jira/Confluence returns 0 items** | Atlassian creds wrong, or no tickets/pages exist yet, or your tickets use issue types not in the JQL filter (default: `Epic, Story, Task, Requirement, Feature`) |
| **`Vertex AI SDK not found`** in agent log | Harmless — governance assessment falls back to a stub. Install `google-cloud-aiplatform` if you want it |
| **Agent process exits at startup** | Check `backend/Agents/.env` exists and has at minimum `GOOGLE_API_KEY` or `OPENAI_API_KEY` |
| **Port already in use** | `Stop-Process -Name node, python -Force` (Windows) to kill stragglers |

### Security Reminders

- **Never commit `.env` files** — they're gitignored for good reason. If you accidentally commit one, **rotate every key inside it immediately.**
- API tokens (Atlassian, OpenAI, Google) should be **rotated periodically** and revoked the moment they're no longer needed.
- The demo password (`governance.demo@Rakfort`) is fine for local dev only. Change it before exposing the app to a network.

## Contact & Support

For more information, please visit our official website or get in touch.

* **Website:** [https://rakfort.com](https://rakfort.com)
* **AI Governance Page:** [https://governance.rakfort.com](https://governance.rakfort.com)
* **Contact Us:** info@rakfort.com;  [https://rakfort.com/contact/](https://rakfort.com/contact/); 
