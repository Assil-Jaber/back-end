const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/auth.controller");

const router = express.Router();

// Public
router.post("/register", c.register);
router.post("/login", c.login);
router.post("/refresh", c.refresh);
router.post("/logout", c.logout);

// Protected
router.get("/me", auth, c.getMe);
router.patch("/me", auth, c.updateMe);
router.patch("/change-password", auth, c.changePassword);
router.get("/stats", auth, c.getStats);

module.exports = router;
