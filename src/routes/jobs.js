const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/jobs.controller");

const router = express.Router();

// Public
router.get("/", c.list);
router.get("/matches", auth, c.getMatches);
router.get("/saved", auth, c.getSaved);
router.get("/applications", auth, c.getApplications);
router.get("/:id", c.getOne);

// Protected actions
router.post("/:id/save", auth, c.toggleSave);
router.post("/:id/apply", auth, c.apply);
router.patch("/applications/:id", auth, c.updateApplication);

module.exports = router;
