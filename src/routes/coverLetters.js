const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/coverLetter.controller");

const router = express.Router();

router.use(auth);

router.post("/", c.generate);          // Frontend calls POST /cover-letters
router.post("/generate", c.generate);   // Original route kept for compat
router.get("/", c.list);
router.get("/:id", c.getOne);
router.delete("/:id", c.remove);

module.exports = router;
