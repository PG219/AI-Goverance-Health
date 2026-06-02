# 🚀 Setup and Run Guide - Rakfort AI Governance Platform

This guide explains how to configure, set up, and run the Rakfort AI Governance Platform from a fresh clone.

---

## 🛠️ Overview of Services

The platform consists of three main components (located inside the `ai-governance-main` directory):
1. **Frontend**: A React + Vite SPA (runs on port `5173`).
2. **Backend**: An Express.js Node API (runs on port `3001`).
3. **AI Agents**: A FastAPI Python agent service (runs on port `8000`).

---

## 🔑 Files to Create Before Running

All configuration is handled via `.env` files. Because `.env` files contain sensitive API credentials (such as Google API keys and Atlassian tokens), they are gitignored and **must not be committed to GitHub**.

To run the application, you must create **three `.env` files** based on the provided `.env.example` templates in their respective directories inside `ai-governance-main/`.

### 1️⃣ Frontend Config File (`ai-governance-main/frontend/.env`)
Create a file at `ai-governance-main/frontend/.env` and insert:
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001
VITE_AGENT_URL=http://localhost:8000
VITE_APP_NAME="AI Governance"
```

### 2️⃣ Backend Config File (`ai-governance-main/backend/.env`)
Create a file at `ai-governance-main/backend/.env` and insert (filling in your own secrets):
```env
# Development MongoDB (Local)
MONGODB_URI=mongodb://admin:password123@localhost:27017/governance_db?authSource=admin
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_jwt_secret_key_at_least_32_characters
AGENT_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_session_secret_key
```

### 3️⃣ Python Agents Config File (`ai-governance-main/backend/Agents/.env`)
Create a file at `ai-governance-main/backend/Agents/.env` and insert:
```env
GENAI_PROVIDER=gemini
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBED_MODEL=models/text-embedding-004

# Your Gemini API Key from Google AI Studio
GOOGLE_API_KEY=your_google_gemini_api_key_here

# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/governance_db?authSource=admin
MONGODB_DB=AI-Governance
MONGODB_UPLOADS_COL=rag_uploads
MONGODB_CHATS_COL=rag_chats

# Atlassian Integrations (Jira & Confluence syncing)
ATLASSIAN_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-atlassian-email@example.com
ATLASSIAN_API_TOKEN=your_atlassian_api_token
```

> [!WARNING]
> **Git Protection:** Double-check that all three `.env` files are ignored by checking your git status before committing. Never push raw API keys or passwords to GitHub.

---

## ⚡ Step-by-Step Installation

Follow these commands in your terminal to set up the dependencies:

### Step 1: Install Backend Node Dependencies
```bash
cd ai-governance-main/backend
npm install
```

### Step 2: Install Frontend Node Dependencies
```bash
cd ../frontend
npm install
```

### Step 3: Setup Python Agent Virtual Environment
```bash
cd ../backend/Agents
python -m venv .venv

# Activate the virtual environment:
# On Windows PowerShell:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies:
pip install -r requirements.txt
```

---

## 🗄️ Database Setup & Seeding

The application requires MongoDB and Redis to be running.

### 1. Start Services via Docker Compose
To run MongoDB and Redis easily, start them using the Docker Compose configuration inside the `backend/` directory:
```bash
cd ai-governance-main/backend
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Seed Assessment Templates (Node Backend)
Ensure your backend dependencies are installed, then run the database seeding command inside the `backend/` directory:
```bash
cd ai-governance-main/backend
npm run seed
```
*This inserts the default AI System, Cybersecurity, and Third-party assessment questionnaire templates into your database.*

### 3. Seed Risk & Control Libraries (Python Agent)
With your Python virtual environment activated, run the excel importer script in the `backend/Agents/` directory:
```bash
cd ai-governance-main/backend/Agents
python import_libraries.py
```
*This imports predefined AI & Cyber risks/controls from local Excel templates directly into your MongoDB database.*

---

## 🏃 Running the Application (3 Terminals)

To start the platform, run the following commands in three separate terminal windows:

### Terminal 1: Express Backend
```bash
cd ai-governance-main/backend
npm run dev
```
*Runs on `http://localhost:3001`*

### Terminal 2: Python FastAPI Agent
```bash
cd ai-governance-main/backend/Agents
# Ensure venv is activated
.\.venv\Scripts\python main.py
```
*Runs on `http://localhost:8000`*

### Terminal 3: Vite React Frontend
```bash
cd ai-governance-main/frontend
npm run dev
```
*Runs on `http://localhost:5173`*

---

## 👤 Creating the Demo User
Once the backend server is running in Terminal 1, run the one-time script in a separate terminal to create your admin demo user account:
```bash
cd ai-governance-main/backend
node createDemoUser.js
```
*Expected Output: `Status: 200` with the user registration info.*

You can now navigate to **`http://localhost:5173`** and log in using:
* **Email**: `demo@rakfort.com`
* **Password**: `governance.demo@Rakfort`

---

## 🌐 Verification Endpoints

Use these URLs to verify that all systems are healthy:

| Service | Endpoint URL | Expected Healthy Response |
| :--- | :--- | :--- |
| **Frontend** | `http://localhost:5173` | Renders Login Page |
| **Backend API** | `http://localhost:3001/` | `{"status":"running"}` or similar JSON |
| **Agent API** | `http://localhost:8000/health` | `{"status":"ok"}` or version JSON |
| **Library Sync Status** | `http://localhost:8000/agent/libraries/status` | JSON displaying imported risk/control counts > 0 |

---

## ⚙️ Troubleshooting

* **MongoDB Connection Issues**: Ensure Docker is running and ports are mapped correctly (`27017`). Check backend logs in Terminal 1.
* **Agent Library Counts 0**: Run `python import_libraries.py` in the `backend/Agents` directory to import the local excel libraries to MongoDB.
* **Vite build spawn permission errors**: If you encounter esbuild EPERM errors during frontend dev server launch on Windows, run your terminal as Administrator or verify Node permissions.
