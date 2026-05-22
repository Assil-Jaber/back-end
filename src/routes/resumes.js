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

// PDF upload with multer error handling — supports both /parse and /upload paths
const uploadHandler = (req, res, next) => {
  c.upload.single("cv")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ success: false, status: 400, message: "File too large. Max size is 5MB." });
      return res.status(400).json({ success: false, status: 400, message: err.message });
    }
    next();
  });
};

router.post("/parse", uploadHandler, c.uploadPDF);   // Frontend calls /parse
router.post("/upload", uploadHandler, c.uploadPDF);   // Original route kept

module.exports = router;
