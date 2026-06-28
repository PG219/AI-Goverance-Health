# Pranay Changes

This file documents the local integration changes made for the AI Governance healthcare workflow.

## What Changed

### 1. Gemini 2.5 Flash for AI Agents

The Python agents were moved away from OpenAI for the active requirement/risk/control flows.

Current model configuration lives in:

```txt
backend/Agents/.env
```

Required values:

```env
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_CHAT_MODEL=gemini-2.5-flash
```

Shared Gemini helper:

```txt
backend/Agents/agents/llm_provider.py
```

Updated agents:

```txt
backend/Agents/agents/collection_agent.py
backend/Agents/agents/integration_service.py
backend/Agents/agents/risk_matrix_agent.py
backend/Agents/agents/risk_control_agent.py
```

### 2. Guided Requirement Collection

The Requirements AI Collection tab now works as a guided intake flow.

User flow:

```txt
User describes system/query
AI asks follow-up questions
AI extracts candidate requirements
User confirms Add or rejects
Confirmed requirements are saved to inventory
AI moves to the next collection topic
```

Frontend page:

```txt
frontend/src/pages/requirements/index.jsx
```

Backend proxy:

```txt
backend/routes/requirements.js
```

### 3. Project-Based Chat History

Chat history is now stored by project so a user can stop and resume later.

New model:

```txt
backend/models/ChatSession.js
```

New backend endpoints:

```txt
GET  /requirements/chat-session/:projectId
PUT  /requirements/chat-session/:projectId
```

Frontend service:

```txt
frontend/src/services/requirementsService.js
```

The AI Collection tab now has a project selector. Selecting a project restores its previous chat messages and pending requirements.

### 4. Excel Libraries Imported Into MongoDB

Excel files are still kept as seed/reference data, but runtime mapping can now use MongoDB first.

Excel seed files:

```txt
backend/Agents/predefined_risks.xlsx
backend/Agents/predefined_controls.xlsx
backend/Agents/stride_risks.xlsx
backend/Agents/nist_controls.xlsx
```

New library store:

```txt
backend/Agents/agents/library_store.py
```

Import script:

```txt
backend/Agents/import_libraries.py
```

Import command:

```powershell
cd backend/Agents
python import_libraries.py
```

Imported counts from local run:

```txt
ai_risks: 60
cyber_risks: 36
ai_controls: 46
nist_controls: 31
```

New agent endpoints:

```txt
GET  /agent/libraries/status
POST /agent/libraries/import
```

### 5. Healthcare Assessment Excel Export

The Requirements page now has an Export Assessment button that generates a workbook similar to:

```txt
RAKFORT_Healthcare_Risk_Assessment.xlsx
```

Generated sheets:

```txt
Project Overview
Cyber Assets Inventory
Requirements Matrix
Threat & Attack Vectors
Risk Register
ISO 27001 Controls
IEC 62443 Mapping
Control Effectiveness
Risk Treatment Plan
Compliance Dashboard
```

Frontend file:

```txt
frontend/src/pages/requirements/index.jsx
```

### 6. MongoDB Project ID Support

Requirements now store project IDs as project code strings, such as:

```txt
AI-1234
CB-5678
```

Updated model:

```txt
backend/models/SecurityRequirement.js
```

## How To Run

### Backend

```powershell
cd backend
npm start
```

Expected:

```txt
Server running on port 3001
MongoDB connected successfully
```

### Python Agent

```powershell
cd backend/Agents
python main.py
```

Expected:

```txt
Application startup complete
```

### Frontend

```powershell
cd frontend
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Verification URLs

Backend:

```txt
http://localhost:3001/
```

Agent:

```txt
http://localhost:8000/health
```

Mongo-backed library status:

```txt
http://localhost:8000/agent/libraries/status
```

Expected library status:

```json
{
  "mongo_connected": true,
  "ai_risks": 60,
  "cyber_risks": 36,
  "ai_controls": 46,
  "nist_controls": 31
}
```

## Notes

- Docker is used for MongoDB and Redis locally, but this shell may show Docker API permission errors on Windows.
- MongoDB is verified through backend functionality and agent library counts.
- If `npm run build` fails with `spawn EPERM`, that is a local Windows/esbuild permission issue. The dev server can still run.
- Keep API keys only in backend/server-side `.env` files, never in frontend `.env`.
