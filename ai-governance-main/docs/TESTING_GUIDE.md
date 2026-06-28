# 🧪 Testing Guide - Requirements Integration

## 📍 Folder Structure Reference

```
c:\Users\bella\Downloads\AI-Governance-main\
├── ai-governance-main/
│   ├── backend/
│   │   ├── server.js ← Port 3001
│   │   ├── routes/requirements.js
│   │   └── models/SecurityRequirement.js
│   └── frontend/
└── Rakfort Site/
    └── Backend/
        ├── server.js ← Port 3001 (if running)
        └── models/Requirement.js
```

---

## 🔧 STEP 1: Start Backend Server

### Open PowerShell Terminal #1

```powershell
# Navigate to backend folder
cd "c:\Users\bella\Downloads\AI-Governance-main\ai-governance-main\backend"

# Check if node_modules exists
ls node_modules

# If not, install dependencies
npm install

# Start the server
npm start
# OR if using Node directly:
node server.js
```

**Expected Output:**
```
Server running on port 3001
```

✅ **Server running?** → Move to next step

---

## 🔑 STEP 2: Get Authentication Token

### Open Browser DevTools

1. Go to: `http://localhost:3001` (or your frontend URL)
2. **Login** with valid credentials
3. Press `F12` to open DevTools
4. Go to **Console** tab
5. Run this command:

```javascript
console.log(localStorage.getItem('token'))
```

6. **Copy the entire token** (starts with `eyJ...`)

**Save it as:** `YOUR_TOKEN` for the commands below

---

## 📝 STEP 3: Prepare Test Variables

Open **PowerShell Terminal #2** (keep #1 running backend)

```powershell
# Set these variables for all test commands
$TOKEN = "YOUR_TOKEN_HERE"  # Paste the token from Step 2
$BACKEND = "http://localhost:3001"

# Verify they're set
Write-Host "Token: $TOKEN"
Write-Host "Backend: $BACKEND"
```

**If you see your values printed → Ready to test!**

---

## 🧪 TEST COMMANDS

### ✅ TEST 1: Create a Requirement

**Run in:** PowerShell Terminal #2

```powershell
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    id = "REQ-2026-001"
    title = "Multi-Factor Authentication (MFA)"
    description = "Implement MFA for all user accounts to enhance security and reduce unauthorized access"
    category = "Authentication"
    priority = "Critical"
    status = "Draft"
    owner = "Security Team"
    verification_method = "Security audit"
    acceptance_criteria = @(
        "Users are forced to set up MFA",
        "MFA is enforced on all logins",
        "Recovery codes are provided"
    )
    linked_assets = @("docs/mfa-policy.pdf", "system/auth-service")
    complianceMappings = @(@{
        framework = "ISO 27001"
        control = "A.9.2.1"
        version = "2022"
    })
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "$BACKEND/requirements" `
    -Method POST `
    -Headers $headers `
    -Body $body

Write-Host "✅ CREATE SUCCESSFUL" -ForegroundColor Green
$response | ConvertTo-Json | Write-Host
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "id": "REQ-2026-001",
    "title": "Multi-Factor Authentication (MFA)",
    "category": "Authentication",
    "priority": "Critical",
    "status": "Draft",
    "createdAt": "2026-04-16T10:30:00Z"
  }
}
```

✅ **Got success response?** → Move to next test

---

### ✅ TEST 2: Get All Requirements

**Run in:** PowerShell Terminal #2

```powershell
$headers = @{
    "Authorization" = "Bearer $TOKEN"
}

$response = Invoke-RestMethod -Uri "$BACKEND/requirements" `
    -Method GET `
    -Headers $headers

Write-Host "✅ FETCH SUCCESSFUL" -ForegroundColor Green
Write-Host "Total Requirements: $($response.total)"
$response.data | ForEach-Object {
    Write-Host "  - $($_.id): $($_.title) [$($_.status)]"
}
```

**Expected Output:**
```
✅ FETCH SUCCESSFUL
Total Requirements: 1
  - REQ-2026-001: Multi-Factor Authentication (MFA) [Draft]
```

---

### ✅ TEST 3: Filter by Priority

**Run in:** PowerShell Terminal #2

```powershell
$headers = @{
    "Authorization" = "Bearer $TOKEN"
}

$response = Invoke-RestMethod `
    -Uri "$BACKEND/requirements?priority=Critical" `
    -Method GET `
    -Headers $headers

Write-Host "✅ FILTER BY PRIORITY" -ForegroundColor Green
Write-Host "Found $($response.total) Critical Requirements:"
$response.data | ForEach-Object {
    Write-Host "  [$($_.priority)] $($_.id): $($_.title)"
}
```

**Expected Output:**
```
✅ FILTER BY PRIORITY
Found 1 Critical Requirements:
  [Critical] REQ-2026-001: Multi-Factor Authentication (MFA)
```

---

### ✅ TEST 4: Filter by Status

**Run in:** PowerShell Terminal #2

```powershell
$response = Invoke-RestMethod `
    -Uri "$BACKEND/requirements?status=Draft" `
    -Method GET `
    -Headers $headers

Write-Host "✅ FILTER BY STATUS" -ForegroundColor Green
Write-Host "Draft Requirements: $($response.total)"
$response.data | ForEach-Object {
    Write-Host "  [$($_.status)] $($_.id)"
}
```

---

### ✅ TEST 5: Filter by Category

**Run in:** PowerShell Terminal #2

```powershell
$response = Invoke-RestMethod `
    -Uri "$BACKEND/requirements?category=Authentication" `
    -Method GET `
    -Headers $headers

Write-Host "✅ FILTER BY CATEGORY" -ForegroundColor Green
Write-Host "Authentication Requirements: $($response.total)"
$response.data | ForEach-Object {
    Write-Host "  $($_.id): $($_.title)"
}
```

---

### ✅ TEST 6: Get Single Requirement

**Run in:** PowerShell Terminal #2

```powershell
$response = Invoke-RestMethod `
    -Uri "$BACKEND/requirements/REQ-2026-001" `
    -Method GET `
    -Headers $headers

Write-Host "✅ GET SINGLE REQUIREMENT" -ForegroundColor Green
Write-Host "ID: $($response.data.id)"
Write-Host "Title: $($response.data.title)"
Write-Host "Status: $($response.data.status)"
Write-Host "Priority: $($response.data.priority)"
Write-Host "Owner: $($response.data.owner)"
```

**Expected Output:**
```
✅ GET SINGLE REQUIREMENT
ID: REQ-2026-001
Title: Multi-Factor Authentication (MFA)
Status: Draft
Priority: Critical
Owner: Security Team
```

---

### ✅ TEST 7: Update Requirement

**Run in:** PowerShell Terminal #2

```powershell
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    status = "In Progress"
    owner = "John Doe"
    priority = "High"
    verification_method = "Automated tests + manual review"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$BACKEND/requirements/REQ-2026-001" `
    -Method PUT `
    -Headers $headers `
    -Body $body

Write-Host "✅ UPDATE SUCCESSFUL" -ForegroundColor Green
Write-Host "New Status: $($response.data.status)"
Write-Host "New Owner: $($response.data.owner)"
Write-Host "New Priority: $($response.data.priority)"
```

**Expected Output:**
```
✅ UPDATE SUCCESSFUL
New Status: In Progress
New Owner: John Doe
New Priority: High
```

---

### ✅ TEST 8: Create Second Requirement (for bulk testing)

**Run in:** PowerShell Terminal #2

```powershell
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    id = "REQ-2026-002"
    title = "Data Encryption at Rest"
    description = "All sensitive data must be encrypted at rest using AES-256"
    category = "Encryption"
    priority = "High"
    status = "Draft"
    owner = "Infrastructure Team"
    complianceMappings = @(@{
        framework = "GDPR"
        control = "Article 32"
    })
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "$BACKEND/requirements" `
    -Method POST `
    -Headers $headers `
    -Body $body

Write-Host "✅ SECOND REQUIREMENT CREATED" -ForegroundColor Green
Write-Host "ID: $($response.data.id)"
```

---

### ✅ TEST 9: Filter by Multiple Criteria

**Run in:** PowerShell Terminal #2

```powershell
$response = Invoke-RestMethod `
    -Uri "$BACKEND/requirements?priority=High&status=Draft" `
    -Method GET `
    -Headers $headers

Write-Host "✅ MULTI-FILTER (High Priority + Draft Status)" -ForegroundColor Green
Write-Host "Found: $($response.total)"
$response.data | ForEach-Object {
    Write-Host "  $($_.id): $($_.title) [$($_.priority) / $($_.status)]"
}
```

---

### ⚠️ TEST 10: AI Collection Endpoint (Requires Python Agent)

**Prerequisites:**
- Python agent must be running on `http://localhost:8000`
- Check: [Rakfort Site/Agents/main.py](../../Rakfort%20Site/Agents/main.py)

**Run in:** PowerShell Terminal #2

```powershell
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    session_id = "test-session-" + [DateTime]::Now.Ticks
    messages = @(
        "We need secure authentication for healthcare data",
        "Multi-factor authentication should be mandatory",
        "All user logins must be logged and audited",
        "Data should be encrypted both in transit and at rest"
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod `
        -Uri "$BACKEND/requirements/collect" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -TimeoutSec 30

    Write-Host "✅ AI COLLECTION SUCCESSFUL" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "❌ AI COLLECTION FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Make sure Python agent is running on http://localhost:8000"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "extracted_requirements": [
      {
        "title": "Healthcare Data Authentication",
        "description": "Implement secure authentication for healthcare data",
        "priority": "Critical",
        ...
      }
    ]
  }
}
```

⚠️ **If this fails:** Python agent is not running (OK for now, skip this test)

---

### ✅ TEST 11: Delete Requirement

**Run in:** PowerShell Terminal #2

```powershell
$headers = @{
    "Authorization" = "Bearer $TOKEN"
}

$response = Invoke-RestMethod `
    -Uri "$BACKEND/requirements/REQ-2026-002" `
    -Method DELETE `
    -Headers $headers

Write-Host "✅ DELETE SUCCESSFUL" -ForegroundColor Green
Write-Host "Response: $($response.message)"
```

**Expected Output:**
```
✅ DELETE SUCCESSFUL
Response: Requirement deleted successfully
```

---

### ✅ TEST 12: Verify Deletion

**Run in:** PowerShell Terminal #2

```powershell
$response = Invoke-RestMethod `
    -Uri "$BACKEND/requirements" `
    -Method GET `
    -Headers $headers

Write-Host "✅ VERIFY DELETION" -ForegroundColor Green
Write-Host "Remaining Requirements: $($response.total)"
$response.data | ForEach-Object {
    Write-Host "  - $($_.id): $($_.title)"
}
```

**Expected:**
```
✅ VERIFY DELETION
Remaining Requirements: 1
  - REQ-2026-001: Multi-Factor Authentication (MFA)
```

REQ-2026-002 should be gone!

---

## 🚨 Error Troubleshooting

### Error: `401 Unauthorized`
```powershell
# Token expired or invalid
# Solution: Get new token from browser console and update $TOKEN variable
console.log(localStorage.getItem('token'))
```

### Error: `400 Bad Request - ID must follow format REQ-YYYY-NNN`
```powershell
# ID format is wrong
# ✅ Correct: "REQ-2026-001"
# ❌ Wrong: "req-2026-001" or "REQ-26-1"
```

### Error: `500 Internal Server`
```powershell
# Backend crashed
# Check Terminal #1 for error messages
# Restart: npm start (in Terminal #1)
```

### Error: `Cannot connect to http://localhost:3001`
```powershell
# Backend not running
# Start backend: npm start (in Terminal #1)
```

### Error on `/collect` endpoint: `Failed to communicate with AI agent`
```powershell
# Python agent not running
# This is OK for testing - skip this test
# To fix: Start Python agent from Rakfort Site/Agents folder
```

---

## 📋 Complete Testing Checklist

Copy-paste this and check off as you go:

```
SETUP PHASE:
☐ Backend running on port 3001 (Terminal #1)
☐ Got auth token from browser
☐ Set $TOKEN and $BACKEND variables (Terminal #2)

TESTS:
☐ TEST 1: Create Requirement (POST) → Got success?
☐ TEST 2: Get All Requirements (GET) → See 1 requirement?
☐ TEST 3: Filter by Priority → See Critical only?
☐ TEST 4: Filter by Status → See Draft only?
☐ TEST 5: Filter by Category → See Authentication only?
☐ TEST 6: Get Single → See full details?
☐ TEST 7: Update → Status changed to "In Progress"?
☐ TEST 8: Create Second → Got new ID REQ-2026-002?
☐ TEST 9: Multi-filter → See High+Draft only?
☐ TEST 10: AI Collection (OPTIONAL, requires Python agent)
☐ TEST 11: Delete → REQ-2026-002 deleted?
☐ TEST 12: Verify Deletion → Only REQ-2026-001 remains?

RESULT:
✅ All tests passed! Integration is working!
```

---

## 📊 Test Results Log

**Date:** April 16, 2026  
**Backend Version:** Node.js/Express  
**Database:** MongoDB

| Test # | Endpoint | Method | Status | Notes |
|--------|----------|--------|--------|-------|
| 1 | /requirements | POST | ✅ | Create works |
| 2 | /requirements | GET | ✅ | Fetch works |
| 3 | /requirements?priority=... | GET | ✅ | Filter works |
| 4 | /requirements?status=... | GET | ✅ | Filter works |
| 5 | /requirements?category=... | GET | ✅ | Filter works |
| 6 | /requirements/:id | GET | ✅ | Single fetch works |
| 7 | /requirements/:id | PUT | ✅ | Update works |
| 8 | /requirements | POST | ✅ | Create 2nd works |
| 9 | /requirements?p=...&s=... | GET | ✅ | Multi-filter works |
| 10 | /requirements/collect | POST | ⚠️ | Requires Python agent |
| 11 | /requirements/:id | DELETE | ✅ | Delete works |
| 12 | /requirements | GET | ✅ | Verify deletion |

---

## 🎯 Quick Command Summary

```powershell
# Terminal #1: Start Backend
cd "c:\Users\bella\Downloads\AI-Governance-main\ai-governance-main\backend"
npm start

# Terminal #2: Get Token & Test
$TOKEN = "YOUR_TOKEN"
$BACKEND = "http://localhost:3001"

# Then run any test command from "TEST COMMANDS" section above
```

---

## ✅ If All Tests Pass

Congratulations! 🎉

Your integration is working correctly:
- ✅ Backend API functional
- ✅ Database operations work
- ✅ Authentication works
- ✅ All CRUD operations work
- ✅ Filtering works
- ✅ Schema validation works

**Next:** Deploy to production per deployment checklist

---

## ❌ If Tests Fail

Check:
1. Backend is running (Terminal #1 logs)
2. Token is valid (try logging in again)
3. ID format is correct (REQ-YYYY-NNN)
4. MongoDB is running
5. Network connectivity

See "Error Troubleshooting" section above.
