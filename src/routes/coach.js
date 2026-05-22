const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/coach.controller");

const router = express.Router();

router.use(auth);

// Backend canonical routes
router.post("/", c.createSession);
router.get("/", c.getSessions);
router.post("/:id/messages", c.sendMessage);
router.get("/:id/messages", c.getMessages);

// Frontend-compatible aliases
router.post("/session", c.createSession);
router.get("/sessions", c.getSessions);
router.get("/sessions/:id/messages", c.getMessages);
router.post("/message", c.sendMessageByBody);

module.exports = router;
