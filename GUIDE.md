# Hirely Backend — What's Done & What You Need to Build

## What's Already Done (Auth Server)

The backend repo already has a working JWT authentication system. You can run it with `npm run dev`.

### Existing Endpoints

| Method | URL | What it does |
|--------|-----|-------------|
| POST | `/api/auth/register` | Create a new account (name, email, password) |
| POST | `/api/auth/login` | Login and get a token + refresh token |
| POST | `/api/auth/refresh` | Get a new token when the old one expires |
| POST | `/api/auth/logout` | Logout (deletes the refresh token) |
| GET | `/api/users/me` | Get the logged-in user's profile (needs token) |

### Existing Files

```
src/
├── server.js              ← Main app (Express setup, routes, middleware)
├── db.js                  ← SQLite database (creates tables automatically)
├── middleware/
│   └── auth.js            ← JWT token checker (protects routes)
├── routes/
│   ├── auth.js            ← Register, login, refresh, logout
│   └── users.js           ← User profile
└── utils/
    ├── response.js        ← Helper for consistent JSON responses
    └── validators.js      ← Input validation (email, password, etc.)
```

### How to Run

```bash
git clone <repo-url>
cd back-end
npm install
npm run dev
```

That's it. The database creates itself on first run. No setup needed.

---

## What You Need to Build

You need to add **6 new endpoints** for CV parsing, job listings, and AI job matching.

---

### Step 1: Add New Database Tables

Open `src/db.js` and add these tables inside the `db.exec(...)` block:

**resumes** — stores the parsed CV data

- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `user_id` (INTEGER, FOREIGN KEY → users.id)
- `full_name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `summary` (TEXT)
- `skills` (TEXT — store as comma-separated or JSON string)
- `ai_score` (INTEGER — optional, for later)
- `created_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

**resume_experiences** — work experience entries

- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `resume_id` (INTEGER, FOREIGN KEY → resumes.id)
- `company` (TEXT)
- `title` (TEXT)
- `start_date` (TEXT)
- `end_date` (TEXT)
- `description` (TEXT)

**resume_education** — education entries

- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `resume_id` (INTEGER, FOREIGN KEY → resumes.id)
- `school` (TEXT)
- `degree` (TEXT)
- `field` (TEXT)
- `year` (TEXT)

**jobs** — job listings (you will fill this with fake data)

- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `title` (TEXT — e.g. "Frontend Developer")
- `company` (TEXT — e.g. "Google")
- `location` (TEXT — e.g. "Beirut, Lebanon")
- `type` (TEXT — "full-time", "part-time", "remote")
- `description` (TEXT)
- `requirements` (TEXT — skills needed, e.g. "React, Node.js, SQL")
- `salary` (TEXT — optional)
- `posted_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

After adding the tables, **delete the old `database.db` file** and restart the server so it creates a fresh database with the new tables.

---

### Step 2: Seed Fake Jobs

Create a file `src/seed.js` that inserts 30–50 fake jobs into the `jobs` table. Run it once with `node src/seed.js`. Include a mix of:

- Software Engineer, Frontend Developer, Backend Developer
- Data Analyst, UI/UX Designer, Marketing Manager
- Different locations, types, and requirements

This is your job board data. No need for a real API.

---

### Step 3: Install New Packages

```bash
npm install multer pdf-parse @google/generative-ai
```

- `multer` — handles file uploads (PDF)
- `pdf-parse` — extracts text from PDF files
- `@google/generative-ai` — Google Gemini AI SDK

Add to your `.env` file:

```
GEMINI_API_KEY=your-key-from-aistudio.google.com
```

To get the key: go to [aistudio.google.com](https://aistudio.google.com) → sign in with Google → click "Get API Key". It's **free** (no credit card).

---

### Step 4: Create the Gemini AI Service

Create `src/services/gemini.js`

This file connects to Gemini and has two functions:

**Function 1: `parseResume(text)`**

- Takes the raw text extracted from a PDF
- Sends it to Gemini with a prompt asking it to return structured JSON
- The prompt should say something like: "Extract from this resume: full_name, email, phone, summary, skills (as array), experiences (as array of objects with company, title, start_date, end_date, description), education (as array of objects with school, degree, field, year). Return only valid JSON."
- Parse the response and return the JSON object

**Function 2: `matchResumeToJobs(skills, jobs)`**

- Takes the user's skills (array) and a list of jobs
- For each job, count how many of the user's skills appear in the job's `requirements` text
- Calculate a match score: `(matches / total_skills) * 100`
- Return the jobs sorted by score (highest first)

You can use simple string matching (`.includes()` or `.toLowerCase()`) for matching — no need for AI here unless you want to.

---

### Step 5: Build the Resume Endpoints

Create `src/routes/resumes.js` with these endpoints:

**POST `/api/resumes/upload`** (protected — needs token)

1. Use `multer` to receive a PDF file
2. Use `pdf-parse` to extract text from the PDF
3. Send the text to your `parseResume()` function
4. Save the result to the `resumes`, `resume_experiences`, and `resume_education` tables
5. Return the parsed data as JSON

**GET `/api/resumes`** (protected)

1. Query all resumes where `user_id` matches the logged-in user
2. Return the list

**GET `/api/resumes/:id`** (protected)

1. Get the resume by ID (make sure it belongs to the logged-in user!)
2. Also get its experiences and education (separate queries or JOIN)
3. Return everything together

Don't forget to register the routes in `server.js`:

```js
app.use("/api/resumes", resumeRoutes);
```

---

### Step 6: Build the Job Endpoints

Create `src/routes/jobs.js` with these endpoints:

**GET `/api/jobs`** (public — no token needed)

1. Get query parameters: `search`, `location`, `type`, `page`
2. Build a SQL query with optional WHERE clauses:
   - If `search` exists: `WHERE title LIKE '%search%' OR company LIKE '%search%'`
   - If `location` exists: `AND location LIKE '%location%'`
   - If `type` exists: `AND type = 'full-time'`
3. Add pagination: `LIMIT 20 OFFSET (page - 1) * 20`
4. Return the jobs + total count

**GET `/api/jobs/:id`** (public)

1. Get a single job by ID
2. Return it (or 404 if not found)

**GET `/api/jobs/matches`** (protected — needs token)

1. Get the logged-in user's latest resume from the database
2. If no resume: return error "Upload a resume first"
3. Get all jobs from the database
4. Call your `matchResumeToJobs(skills, jobs)` function
5. Return the top 20 matches with their scores

Register in `server.js`:

```js
app.use("/api/jobs", jobRoutes);
```

---

## Final File Structure

When you're done, your project should look like this:

```
src/
├── server.js                  ← Add new routes here
├── db.js                      ← Add new tables here
├── seed.js                    ← Run once to fill jobs table
├── middleware/
│   └── auth.js                ← Already done
├── routes/
│   ├── auth.js                ← Already done
│   ├── users.js               ← Already done
│   ├── resumes.js             ← YOU BUILD THIS
│   └── jobs.js                ← YOU BUILD THIS
├── services/
│   └── gemini.js              ← YOU BUILD THIS
└── utils/
    ├── response.js            ← Already done (use it!)
    └── validators.js          ← Already done (use it!)
```

---

## All Endpoints Summary

| # | Method | URL | Auth? | Status |
|---|--------|-----|-------|--------|
| 1 | POST | `/api/auth/register` | No | Done ✅ |
| 2 | POST | `/api/auth/login` | No | Done ✅ |
| 3 | POST | `/api/auth/refresh` | No | Done ✅ |
| 4 | POST | `/api/auth/logout` | No | Done ✅ |
| 5 | GET | `/api/users/me` | Yes | Done ✅ |
| 6 | POST | `/api/resumes/upload` | Yes | You build |
| 7 | GET | `/api/resumes` | Yes | You build |
| 8 | GET | `/api/resumes/:id` | Yes | You build |
| 9 | GET | `/api/jobs` | No | You build |
| 10 | GET | `/api/jobs/:id` | No | You build |
| 11 | GET | `/api/jobs/matches` | Yes | You build |

---

## Tips

- Always use the `auth` middleware on protected routes (look at how `users.js` does it)
- Use the `errorResponse()` and `successResponse()` helpers from `utils/response.js` for consistent responses
- Use the `validators.js` functions to validate input
- Test every endpoint with Postman before moving to the frontend
- When Gemini returns JSON, it sometimes wraps it in markdown backticks — strip those before parsing
- Delete `database.db` and restart whenever you change the table structure in `db.js`
