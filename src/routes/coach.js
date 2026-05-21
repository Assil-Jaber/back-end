const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/coach.controller");

const router = express.Router();

router.use(auth);

router.post("/", c.createSession);
router.get("/", c.getSessions);
router.post("/:id/messages", c.sendMessage);
router.get("/:id/messages", c.getMessages);

module.exports = router;
