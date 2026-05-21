require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const resumeRoutes = require("./routes/resumes");
const jobRoutes = require("./routes/jobs");
const profileRoutes = require("./routes/profile");
const coverLetterRoutes = require("./routes/coverLetters");
const coachRoutes = require("./routes/coach");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/linkedin", profileRoutes);
app.use("/api/cover-letters", coverLetterRoutes);
app.use("/api/coach", coachRoutes);

// ── Health check ─────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Hirely API is running", version: "2.0" });
});

// ── 404 handler ──────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global error handler ─────────────
app.use(errorHandler);

// ── Start server ─────────────────────
app.listen(PORT, () => {
  console.log(`Hirely API running on http://localhost:${PORT}`);
});
