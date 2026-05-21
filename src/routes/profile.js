const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/profile.controller");

const router = express.Router();

router.use(auth);

router.get("/auth-url", c.getAuthUrl);
router.post("/callback", c.callback);
router.post("/analyze", c.analyze);
router.get("/history", c.getHistory);
router.get("/status", c.getStatus);
router.delete("/disconnect", c.disconnect);

module.exports = router;
