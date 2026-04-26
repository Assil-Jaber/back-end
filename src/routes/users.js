const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// All user routes require authentication
router.use(auth);

// ──────────────────────────────────────
// GET /api/users/me — get current user profile
// ──────────────────────────────────────
router.get("/me", (req, res) => {
  try {
    const user = db.prepare("SELECT id, name, email, created_at FROM users WHERE id = ?").get(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
