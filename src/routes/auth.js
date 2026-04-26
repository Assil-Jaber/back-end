const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");
const { isValidEmail, isStrongPassword, isValidString } = require("../utils/validators");
const { errorResponse, successResponse } = require("../utils/response");

const router = express.Router();

// Helper: generate a random refresh token and store it in the database
function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString("hex");

  // Refresh token expires in 7 days (or from env)
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  db.prepare("INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt
  );

  return token;
}

// ──────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    if (!req.body) {
      return errorResponse(res, 400, "Request body is required (send JSON)");
    }
    const { name, email, password } = req.body;

    // Validate input
    const errors = [];
    if (!name) errors.push("Name is required");
    if (!email) errors.push("Email is required");
    if (!password) errors.push("Password is required");

    if (errors.length > 0) {
      return errorResponse(res, 400, "Validation failed", errors);
    }

    if (!isValidString(name, 2, 50)) {
      return errorResponse(res, 400, "Name must be between 2 and 50 characters");
    }

    if (!isValidEmail(email)) {
      return errorResponse(res, 400, "Please provide a valid email address");
    }

    if (!isStrongPassword(password)) {
      return errorResponse(res, 400, "Password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number");
    }

    // Check if user already exists
    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existingUser) {
      return errorResponse(res, 409, "Email already registered");
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into the database
    const result = db.prepare(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
    ).run(name, email, hashedPassword);

    return successResponse(res, {
      message: "User registered successfully",
      userId: result.lastInsertRowid,
    }, 201);
  } catch (err) {
    console.error("Register error:", err);
    return errorResponse(res, 500, "Server error");
  }
});

// ──────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    if (!req.body) {
      return errorResponse(res, 400, "Request body is required (send JSON)");
    }
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return errorResponse(res, 400, "Email and password are required");
    }

    if (!isValidEmail(email)) {
      return errorResponse(res, 400, "Please provide a valid email address");
    }

    // Find user by email
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    // Create JWT access token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Create refresh token
    const refreshToken = generateRefreshToken(user.id);

    return successResponse(res, {
      message: "Login successful",
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return errorResponse(res, 500, "Server error");
  }
});

// ──────────────────────────────────────
// POST /api/auth/refresh — get a new access token using refresh token
// ──────────────────────────────────────
router.post("/refresh", (req, res) => {
  try {
    if (!req.body) {
      return errorResponse(res, 400, "Request body is required (send JSON)");
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 400, "Refresh token is required");
    }

    // Find the refresh token in the database
    const storedToken = db.prepare(
      "SELECT * FROM refresh_tokens WHERE token = ?"
    ).get(refreshToken);

    if (!storedToken) {
      return errorResponse(res, 401, "Invalid refresh token");
    }

    // Check if expired
    if (new Date(storedToken.expires_at) < new Date()) {
      // Delete expired token
      db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(storedToken.id);
      return errorResponse(res, 401, "Refresh token has expired, please login again");
    }

    // Get the user
    const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(storedToken.user_id);
    if (!user) {
      return errorResponse(res, 401, "User not found");
    }

    // Generate new access token
    const newToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return successResponse(res, {
      message: "Token refreshed",
      token: newToken,
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return errorResponse(res, 500, "Server error");
  }
});

// ──────────────────────────────────────
// POST /api/auth/logout — revoke refresh token
// ──────────────────────────────────────
router.post("/logout", (req, res) => {
  try {
    if (!req.body) {
      return errorResponse(res, 400, "Request body is required (send JSON)");
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 400, "Refresh token is required");
    }

    // Delete the refresh token from the database
    db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(refreshToken);

    return successResponse(res, { message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return errorResponse(res, 500, "Server error");
  }
});

module.exports = router;
