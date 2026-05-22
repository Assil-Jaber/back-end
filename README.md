# Hirely — Backend API

Node.js + Express REST API for the Hirely AI Career Platform.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** SQLite (better-sqlite3)
- **AI:** Google Gemini 2.5 Flash
- **Auth:** JWT (access + refresh tokens) + bcrypt
- **Jobs API:** Adzuna
- **File Upload:** Multer + pdf-parse

## Prerequisites

- Node.js >= 18
- npm

## Setup

1. **Clone the repo:**

   ```bash
   git clone https://github.com/Assil-Jaber/back-end.git
   cd back-end
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Then fill in the `.env` file with actual values.

   > **Note:** Ask **Aseel** for the environment variable values (API keys, secrets, etc.)

4. **Run the server:**

   ```bash
   # Development (hot reload)
   npm run dev

   # Production
   npm start
   ```

   Server starts on `http://localhost:5001` (or the PORT in `.env`).

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5001) |
| `JWT_SECRET` | Secret for access token signing |
| `JWT_EXPIRES_IN` | Access token expiry (e.g., `24h`) |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (e.g., `7d`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model name (e.g., `gemini-2.5-flash`) |
| `ADZUNA_APP_ID` | Adzuna job search API app ID |
| `ADZUNA_APP_KEY` | Adzuna job search API app key |

## API Docs

See [API_DOCS.md](./API_DOCS.md) for full endpoint documentation.

## Project Structure

```
src/
├── server.js          # Entry point
├── db.js              # SQLite database setup & schema
├── seed.js            # Database seeding
├── controllers/       # Route handlers
├── middleware/        # Auth middleware
├── routes/            # Express route definitions
├── services/          # Business logic (Gemini AI, Adzuna, etc.)
└── utils/             # Helpers
```
