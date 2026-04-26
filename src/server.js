require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────
app.use(cors());
app.use(express.json());

// Handle invalid JSON body (e.g. empty body sent as raw JSON)
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Invalid JSON in request body",
    });
  }
  next(err);
});

// ── Routes ───────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// ── Health check ─────────────────────
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// ── 404 handler (route not found) ────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global error handler ─────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    status: 500,
    message: "Internal server error",
  });
});

// ── Start server ─────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
