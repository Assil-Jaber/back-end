const express = require("express");
const auth = require("../middleware/auth");
const { getMe } = require("../controllers/auth.controller");

const router = express.Router();

// Legacy route — /api/users/me still works, points to same controller
router.get("/me", auth, getMe);

module.exports = router;
