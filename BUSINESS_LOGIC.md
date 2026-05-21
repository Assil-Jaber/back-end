# Hirely API — Business Logic & Endpoint Documentation

> **Base URL:** `http://localhost:6000`  
> **Auth:** JWT Bearer token in `Authorization` header  
> **Content-Type:** `application/json` (unless uploading files)

---

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication & Users](#1-authentication--users)
3. [Resumes](#2-resumes)
4. [Jobs](#3-jobs)
5. [Cover Letters](#4-cover-letters)
6. [Career Coach](#5-career-coach)
7. [LinkedIn Profile](#6-linkedin-profile)
8. [Database Schema](#database-schema)
9. [Error Format](#error-format)

---

## Architecture

```
Request → Route → Controller → Service → Database (SQLite)
                       ↓
                  Gemini AI (for parsing, optimizing, generating)
```

| Layer | Responsibility |
|-------|----------------|
| **Routes** (`src/routes/`) | URL mapping, auth middleware wiring |
| **Controllers** (`src/controllers/`) | Request validation, response formatting, error handling |
| **Services** (`src/services/`) | Database queries (prepared statements), AI calls |
| **Database** (`src/db.js`) | SQLite schema, 12 tables, foreign keys |

---

## 1. Authentication & Users

### Register

```
POST /api/auth/register  (public)
```

**Body:**

```json
{ "name": "Assil Jaber", "email": "assil@test.com", "password": "Test1234" }
```

**Business Logic:**
- Validates: name (2–50 chars), email format, password strength (6+ chars, 1 uppercase, 1 lowercase, 1 number)
- Checks email not already registered → 409 if duplicate
- Hashes password with bcrypt (salt rounds = 10)
- Creates user with `plan = 'free'` by default

**Response:** `201` with `userId`

---

### Login

```
POST /api/auth/login  (public)
```

**Body:**

```json
{ "email": "assil@test.com", "password": "Test1234" }
```

**Business Logic:**
- Finds user by email, compares password hash
- Returns generic "Invalid email or password" for both wrong email and wrong password (security best practice)
- Generates JWT access token (expires in `JWT_EXPIRES_IN`, default 5 minutes)
- Generates random refresh token (80-char hex), stored in DB with expiry (default 7 days)

**Response:** `200` with `token`, `refreshToken`, and `user` object

---

### Refresh Token

```
POST /api/auth/refresh  (public)
```

**Body:**

```json
{ "refreshToken": "5d8e93d2..." }
```

**Business Logic:**
- Looks up refresh token in DB
- If expired → deletes it, returns 401
- If valid → issues new JWT access token (does NOT rotate the refresh token)

**Response:** `200` with new `token`

---

### Logout

```
POST /api/auth/logout  (public)
```

**Body:**

```json
{ "refreshToken": "5d8e93d2..." }
```

**Business Logic:**
- Deletes the refresh token from DB (invalidates it)

---

### Get Profile

```
GET /api/auth/me  (auth required)
```

**Business Logic:**
- Returns user info (id, name, email, plan, created_at)
- Returns job preferences if set (desired_title, desired_location, desired_type, min_salary)

---

### Update Profile

```
PATCH /api/auth/me  (auth required)
```

**Body (all optional):**

```json
{
  "name": "New Name",
  "desired_title": "Frontend Developer",
  "desired_location": "Beirut",
  "desired_type": "full-time",
  "min_salary": "1500"
}
```

**Business Logic:**
- Updates user name if provided (validates 2–50 chars)
- Upserts job preferences (INSERT OR REPLACE) — creates if none exist, updates if they do

---

### Change Password

```
PATCH /api/auth/change-password  (auth required)
```

**Body:**

```json
{ "currentPassword": "Test1234", "newPassword": "NewPass1234" }
```

**Business Logic:**
- Verifies current password matches hash
- Validates new password strength
- Hashes and saves new password

---

### Dashboard Stats

```
GET /api/auth/stats  (auth required)
```

**Business Logic:**
- Counts user's: resumes, applications, saved_jobs, cover_letters, coach_sessions
- All counts via single-query SELECTs per table

**Response:**

```json
{ "stats": { "resumes": 2, "applications": 5, "saved_jobs": 3, "cover_letters": 1, "coach_sessions": 2 } }
```

---

## 2. Resumes

All resume endpoints require authentication.

### Create Resume (Manual)

```
POST /api/resumes  (auth required)
```

**Body:**

```json
{
  "full_name": "Assil Jaber",
  "email": "assil@test.com",
  "phone": "+961 71 123456",
  "summary": "CS student at BAU...",
  "skills": "JavaScript, React, Node.js",
  "experience": [
    { "company": "Tech Corp", "title": "Intern", "start_date": "2025-06", "end_date": "2026-01", "description": "Built REST APIs" }
  ],
  "education": [
    { "institution": "BAU", "degree": "BS Computer Science", "start_date": "2022-09", "end_date": "2026-06" }
  ]
}
```

**Business Logic:**
- `full_name` is required, rest optional
- Skills can be string ("JS, React") or array (["JS", "React"]) — normalized to comma-separated string
- Experiences and education inserted as child rows linked by `resume_id`

---

### Upload PDF Resume

```
POST /api/resumes/upload  (auth required, multipart/form-data)
```

**Body:** Form field `resume` with a PDF file (max 5MB)

**Business Logic:**
1. Multer validates: only PDF mime type, max 5MB
2. `pdf-parse` extracts text from the PDF
3. If extracted text < 50 chars → rejects (likely scanned image)
4. Sends extracted text to **Gemini AI** (`parseResume` prompt)
5. Gemini returns structured JSON: full_name, email, phone, summary, skills, experiences, education
6. Saves to DB same as manual create

**Error Cases:**
- No file → 400
- Not PDF → 400
- Scanned PDF (no text) → 400
- No Gemini API key → 503
- AI parse failure → 500

---

### List Resumes

```
GET /api/resumes  (auth required)
```

Returns all resumes for the authenticated user (without experiences/education — use GET /:id for full detail).

---

### Get Single Resume

```
GET /api/resumes/:id  (auth required)
```

**Business Logic:**
- Finds resume by ID + user ownership check
- Loads experiences and education as nested arrays
- 404 if not found or doesn't belong to user

---

### Update Resume

```
PUT /api/resumes/:id  (auth required)
```

**Business Logic:**
- Ownership check
- Updates only provided fields (uses existing values for missing ones)
- If `experiences` array provided → deletes all existing, inserts new ones (full replace)
- Same for `education` array

---

### Delete Resume

```
DELETE /api/resumes/:id  (auth required)
```

---

### Optimize Resume (AI)

```
POST /api/resumes/:id/optimize  (auth required)
```

**Business Logic:**
1. Loads full resume with experiences and education
2. Sends to **Gemini AI** (`optimizeResume` prompt)
3. AI returns:
   - `ats_score` (0–100): ATS compatibility score
   - `keyword_score` (0–100): keyword density/relevance
   - `content_score` (0–100): overall content quality
   - `optimized_summary`: improved summary text
   - `suggested_skills`: array of recommended skills to add
   - `improved_experiences`: array of `{original, improved}` description rewrites
4. Writes scores back to the `resumes` table
5. Writes improved descriptions to `resume_experiences.improved_description`
6. Returns the full optimization result

---

### Set Primary Resume

```
PATCH /api/resumes/:id/primary  (auth required)
```

**Business Logic:**
- Unsets `is_primary` on ALL user's resumes first
- Sets `is_primary = 1` on the specified resume
- Primary resume is used for job matching and cover letter generation

---

## 3. Jobs

### List Jobs

```
GET /api/jobs  (public)
```

**Query Params:**
- `title` — search in job title (LIKE %term%)
- `location` — search in location (LIKE %term%)
- `type` — exact match: full-time, part-time, remote, contract, internship
- `page` — page number (default 1)
- `limit` — results per page (default 20, max 100)

**Business Logic:**
- Dynamic SQL builder with parameterized queries (no SQL injection)
- Returns `total` count for pagination
- Ordered by `posted_at DESC` (newest first)

---

### Get Single Job

```
GET /api/jobs/:id  (public)
```

---

### Match Jobs to Resume

```
GET /api/jobs/matches  (auth required)
```

**Business Logic:**
1. Finds user's primary resume (or latest if none is primary)
2. If no resume → 404
3. Extracts skills from resume (comma-separated → array)
4. Loads ALL jobs from DB
5. **Pure JS matching** (no AI call):
   - For each job: counts how many user skills appear in the job's `requirements` field (case-insensitive)
   - Calculates `match_score` = (matched / total_job_requirements) × 100
   - Adds `matched_skills` count
6. Sorts by `match_score` DESC
7. Returns all jobs with scores (even 0% matches)

---

### Save / Unsave Job (Toggle)

```
POST /api/jobs/:id/save  (auth required)
```

**Business Logic:**
- If job is already saved → removes it (unsave), returns `{ saved: false }`
- If job is not saved → saves it, returns `{ saved: true }`
- Single endpoint, toggle behavior
- UNIQUE constraint on (user_id, job_id) prevents duplicates

---

### Get Saved Jobs

```
GET /api/jobs/saved  (auth required)
```

Returns saved jobs with full job details + `saved_at` timestamp.

---

### Apply to Job

```
POST /api/jobs/:id/apply  (auth required)
```

**Body (optional):**

```json
{ "resume_id": 3, "cover_note": "I'm excited about this opportunity..." }
```

**Business Logic:**
- Checks job exists → 404
- Checks user hasn't already applied → 409 "Already applied"
- Creates application with status `"applied"`
- UNIQUE constraint on (user_id, job_id)

---

### Get My Applications

```
GET /api/jobs/applications  (auth required)
```

Returns applications with job title, company, location joined from jobs table.

---

### Update Application Status

```
PATCH /api/jobs/applications/:id  (auth required)
```

**Body:**

```json
{ "status": "interviewing" }
```

**Valid statuses:** `applied`, `interviewing`, `offered`, `rejected`, `withdrawn`

**Business Logic:**
- Validates status is one of the allowed values
- Ownership check (application must belong to user)

---

## 4. Cover Letters

All endpoints require authentication.

### Generate Cover Letter (AI)

```
POST /api/cover-letters/generate  (auth required)
```

**Body:**

```json
{
  "job_title": "Frontend Developer",
  "company": "Anghami",
  "resume_id": 3,
  "tone": "enthusiastic"
}
```

**Business Logic:**
1. `job_title` and `company` are required
2. If `resume_id` provided → loads that resume's skills
3. If no `resume_id` → uses primary resume's skills (if any)
4. Sends to **Gemini AI** (`generateCoverLetter` prompt) with: skills, job_title, company, tone
5. Default tone: `"professional"`
6. Saves generated letter to DB
7. Returns the generated content

---

### List Cover Letters

```
GET /api/cover-letters  (auth required)
```

---

### Get Single Cover Letter

```
GET /api/cover-letters/:id  (auth required)
```

---

### Delete Cover Letter

```
DELETE /api/cover-letters/:id  (auth required)
```

---

## 5. Career Coach

All endpoints require authentication.

### Create Session

```
POST /api/coach  (auth required)
```

**Body (optional):**

```json
{ "topic": "Interview Preparation" }
```

**Business Logic:**
- `topic` is optional — defaults to "General Career Advice"
- Each session tracks a separate conversation thread

---

### List Sessions

```
GET /api/coach  (auth required)
```

Returns all coach sessions for the user (id, title, created_at).

---

### Send Message

```
POST /api/coach/:id/messages  (auth required)
```

**Body:**

```json
{ "content": "How should I prepare for a React interview?" }
```

**Business Logic:**
1. Verifies session exists and belongs to user
2. Saves the user message to DB (role = "user")
3. Loads full conversation history for context
4. Sends history to **Gemini AI** (`coachReply` prompt)
5. Saves AI response to DB (role = "assistant")
6. Returns both user and AI messages

**Note:** If Gemini fails, the user message is still saved but no AI reply is generated.

---

### Get Messages

```
GET /api/coach/:id/messages  (auth required)
```

Returns session info + all messages (both user and assistant) in chronological order.

---

## 6. LinkedIn Profile

All endpoints require authentication. LinkedIn OAuth is **simulated** (no real OAuth flow).

### Get Auth URL

```
GET /api/linkedin/auth-url  (auth required)
```

Returns a fake OAuth URL. Informational only.

---

### Connect (Simulate OAuth Callback)

```
POST /api/linkedin/callback  (auth required)
```

**Business Logic:**
- Sets `linkedin_connected = 1` and `linkedin_url` on the user record
- Uses hardcoded fake profile data (name, headline, email, URL)
- In a real app, this would exchange an OAuth code for profile data

---

### Get Connection Status

```
GET /api/linkedin/status  (auth required)
```

**Response:**

```json
{ "connected": true, "url": "https://linkedin.com/in/assil-jaber" }
```

---

### Analyze Profile (AI)

```
POST /api/linkedin/analyze  (auth required)
```

**Business Logic:**
1. Checks user has connected LinkedIn → 400 if not
2. Sends fake profile data to **Gemini AI** (`analyzeLinkedIn` prompt)
3. AI returns:
   - `completeness_score` (0–100)
   - `headline_score` (0–100)
   - `keyword_score` (0–100)
   - `suggestions` (array of improvement tips)
   - `improved_headline` (rewritten headline)
4. Saves analysis to `linkedin_analyses` table

---

### Get Analysis History

```
GET /api/linkedin/history  (auth required)
```

Returns all past LinkedIn analyses with parsed suggestions.

---

### Disconnect

```
DELETE /api/linkedin/disconnect  (auth required)
```

Sets `linkedin_connected = 0` and clears `linkedin_url`.

---

## Database Schema

```
users
├── id (PK, auto-increment)
├── name, email (unique), password
├── linkedin_connected (default 0), linkedin_url
├── plan (default 'free')
└── created_at

refresh_tokens
├── id (PK), token (unique), user_id (FK → users)
└── expires_at, created_at

resumes
├── id (PK), user_id (FK → users)
├── full_name, email, phone, summary, skills
├── is_primary (default 0)
├── ats_score, keyword_score, content_score
├── optimized_summary, suggested_skills
└── created_at

resume_experiences
├── id (PK), resume_id (FK → resumes)
├── company, title, start_date, end_date
├── description, improved_description

resume_education
├── id (PK), resume_id (FK → resumes)
├── school, degree, field, year

jobs
├── id (PK)
├── title, company, location, type
├── description, requirements
├── salary, posted_at

job_preferences
├── id (PK), user_id (FK → users, unique)
├── desired_title, desired_location
├── desired_type, min_salary

saved_jobs
├── id (PK), user_id (FK → users), job_id (FK → jobs)
├── created_at
└── UNIQUE(user_id, job_id)

applications
├── id (PK), user_id (FK → users), job_id (FK → jobs)
├── resume_id (FK → resumes, nullable)
├── status (default 'applied'), cover_note
├── created_at
└── UNIQUE(user_id, job_id)

cover_letters
├── id (PK), user_id (FK → users)
├── job_title, company, tone, content
└── created_at

linkedin_analyses
├── id (PK), user_id (FK → users)
├── completeness_score, headline_score, keyword_score
├── suggestions (JSON string), improved_headline
└── created_at

coach_sessions
├── id (PK), user_id (FK → users)
├── title, created_at

coach_messages
├── id (PK), session_id (FK → coach_sessions)
├── role ('user' | 'assistant')
├── content, created_at
```

---

## Error Format

All errors follow a consistent format:

```json
{
  "success": false,
  "status": 400,
  "message": "Descriptive error message"
}
```

**Common Status Codes:**

| Code | Meaning |
|------|---------|
| 400 | Validation error (missing/invalid fields) |
| 401 | Unauthorized (bad credentials or expired token) |
| 404 | Resource not found or doesn't belong to user |
| 409 | Conflict (duplicate email, already applied) |
| 503 | AI service unavailable (no Gemini API key) |
| 500 | Internal server error |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 6000 | Server port |
| `JWT_SECRET` | — | Secret for signing JWTs (required) |
| `JWT_EXPIRES_IN` | 5m | Access token expiry |
| `JWT_REFRESH_SECRET` | — | Secret for refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh token expiry (in days) |
| `GEMINI_API_KEY` | — | Google Gemini API key (required for AI features) |
| `GEMINI_MODEL` | gemini-1.5-flash | Gemini model name |
