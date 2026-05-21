const express = require("express");
const auth = require("../middleware/auth");
const c = require("../controllers/resume.controller");

const router = express.Router();

// All resume routes require auth
router.use(auth);

router.get("/", c.list);
router.post("/", c.create);
router.get("/:id", c.getOne);
router.put("/:id", c.update);
router.delete("/:id", c.remove);
router.post("/:id/optimize", c.optimize);
router.patch("/:id/primary", c.setPrimary);

// PDF upload with multer error handling
router.post("/upload", (req, res, next) => {
  c.upload.single("resume")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ success: false, status: 400, message: "File too large. Max size is 5MB." });
      return res.status(400).json({ success: false, status: 400, message: err.message });
    }
    next();
  });
}, c.uploadPDF);

module.exports = router;
