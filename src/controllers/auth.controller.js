const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const authService = require("../services/auth.service");
const { isValidEmail, isStrongPassword, isValidString } = require("../utils/validators");
const { errorResponse, successResponse } = require("../utils/response");

// Helper: generate a random refresh token and store it
function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString("hex");
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  authService.createRefreshToken(token, userId, expiresAt);
  return token;
}

// POST /register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    const errors = [];
    if (!name) errors.push("Name is required");
    if (!email) errors.push("Email is required");
    if (!password) errors.push("Password is required");
    if (errors.length > 0) return errorResponse(res, 400, "Validation failed", errors);

    if (!isValidString(name, 2, 50)) return errorResponse(res, 400, "Name must be between 2 and 50 characters");
    if (!isValidEmail(email)) return errorResponse(res, 400, "Please provide a valid email address");
    if (!isStrongPassword(password)) return errorResponse(res, 400, "Password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number");

    const existing = authService.findUserIdByEmail(email);
    if (existing) return errorResponse(res, 409, "Email already registered");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = authService.createUser(name, email, hashedPassword);

    return successResponse(res, { message: "User registered successfully", userId: result.lastInsertRowid }, 201);
  } catch (err) {
    console.error("Register error:", err);
    return errorResponse(res, 500, "Server error");
  }
};

// POST /login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return errorResponse(res, 400, "Email and password are required");
    if (!isValidEmail(email)) return errorResponse(res, 400, "Please provide a valid email address");

    const user = authService.findUserByEmail(email);
    if (!user) return errorResponse(res, 401, "Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return errorResponse(res, 401, "Invalid email or password");

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "5m" });
    const refreshToken = generateRefreshToken(user.id);

    return successResponse(res, {
      message: "Login successful",
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return errorResponse(res, 500, "Server error");
  }
};

// GET /me
exports.getMe = (req, res) => {
  try {
    const user = authService.findUserById(req.user.id);
    if (!user) return errorResponse(res, 404, "User not found");

    const prefs = authService.getPreferences(req.user.id);

    return successResponse(res, { user, preferences: prefs || null });
  } catch (err) {
    console.error("Get me error:", err);
    return errorResponse(res, 500, "Server error");
  }
};

// PATCH /me — update profile + job preferences
exports.updateMe = async (req, res) => {
  try {
    const { name, desired_title, desired_location, desired_type, min_salary } = req.body || {};

    if (name) {
      if (!isValidString(name, 2, 50)) return errorResponse(res, 400, "Name must be between 2 and 50 characters");
      authService.updateUserName(name, req.user.id);
    }

    // Upsert job preferences
    if (desired_title || desired_location || desired_type || min_salary) {
      authService.upsertPreferences(req.user.id, desired_title, desired_location, desired_type, min_salary);
    }

    return successResponse(res, { message: "Profile updated" });
  } catch (err) {
    console.error("Update me error:", err);
    return errorResponse(res, 500, "Server error");
  }
};

// PATCH /change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return errorResponse(res, 400, "Current password and new password are required");
    if (!isStrongPassword(newPassword)) return errorResponse(res, 400, "New password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number");

    const user = authService.findFullUserById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return errorResponse(res, 401, "Current password is incorrect");

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    authService.updatePassword(hashed, req.user.id);

    return successResponse(res, { message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return errorResponse(res, 500, "Server error");
  }
};

// GET /stats — dashboard stats
exports.getStats = (req, res) => {
  try {
    const stats = authService.getStats(req.user.id);
    return successResponse(res, { stats });
  } catch (err) {
    console.error("Stats error:", err);
    return errorResponse(res, 500, "Server error");
  }
};

// POST /refresh
exports.refresh = (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return errorResponse(res, 400, "Refresh token is required");

    const stored = authService.findRefreshToken(refreshToken);
    if (!stored) return errorResponse(res, 401, "Invalid refresh token");

    if (new Date(stored.expires_at) < new Date()) {
      authService.deleteRefreshTokenById(stored.id);
      return errorResponse(res, 401, "Refresh token has expired, please login again");
    }

    const user = authService.findUserEmailById(stored.user_id);
    if (!user) return errorResponse(res, 401, "User not found");

    const newToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "5m" });
    return successResponse(res, { message: "Token refreshed", token: newToken });
  } catch (err) {
    console.error("Refresh error:", err);
    return errorResponse(res, 500, "Server error");
  }
};

// POST /logout
exports.logout = (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return errorResponse(res, 400, "Refresh token is required");
    authService.deleteRefreshTokenByToken(refreshToken);
    return successResponse(res, { message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return errorResponse(res, 500, "Server error");
  }
};
