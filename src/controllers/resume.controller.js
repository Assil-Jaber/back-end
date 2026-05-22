const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const resumeService = require("../services/resume.service");
const { parseResume, optimizeResume } = require("../services/gemini");
const { errorResponse, successResponse } = require("../utils/response");

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

exports.upload = upload;

// POST / — create resume (manual JSON or PDF upload)
exports.create = async (req, res) => {
  try {
    const { full_name, email, phone, summary, skills, experiences, education } = req.body || {};

    if (!full_name) return errorResponse(res, 400, "full_name is required");

    const skillsStr = Array.isArray(skills) ? skills.join(", ") : (skills || "");

    const result = resumeService.create(req.user.id, full_name, email, phone, summary, skillsStr);
    const resumeId = result.lastInsertRowid;

    if (Array.isArray(experiences)) resumeService.insertExperiences(resumeId, experiences);
    if (Array.isArray(education)) resumeService.insertEducation(resumeId, education);

    return successResponse(res, { message: "Resume created", resumeId: Number(resumeId), resume: { id: Number(resumeId), full_name, email, phone, summary, skills } }, 201);
  } catch (err) {
    console.error("Create resume error:", err);
    return errorResponse(res, 500, "Failed to create resume.");
  }
};

// POST /upload — upload PDF, parse with Gemini
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, 400, "No PDF file uploaded. Use field name 'resume'.");

    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    const text = pdfData.text;

    if (!text || text.trim().length < 50) {
      return errorResponse(res, 400, "Could not extract enough text from the PDF. Make sure it's not a scanned image.");
    }

    const parsed = await parseResume(text);
    const skillsStr = Array.isArray(parsed.skills) ? parsed.skills.join(", ") : (parsed.skills || "");

    const result = resumeService.create(req.user.id, parsed.full_name, parsed.email, parsed.phone, parsed.summary, skillsStr);
    const resumeId = result.lastInsertRowid;

    if (Array.isArray(parsed.experiences)) resumeService.insertExperiences(resumeId, parsed.experiences);
    if (Array.isArray(parsed.education)) resumeService.insertEducation(resumeId, parsed.education);

    return successResponse(res, {
      message: "Resume uploaded and parsed successfully",
      resume: { id: Number(resumeId), full_name: parsed.full_name, email: parsed.email, phone: parsed.phone, summary: parsed.summary, skills: parsed.skills, experiences: parsed.experiences || [], education: parsed.education || [] },
    }, 201);
  } catch (err) {
    console.error("Resume upload error:", err.message || err);
    if (err.message && err.message.includes("API key")) return errorResponse(res, 503, "AI service not configured. Set a valid GEMINI_API_KEY.");
    if (err.message && err.message.includes("JSON")) return errorResponse(res, 500, "AI failed to parse the resume. Try again.");
    return errorResponse(res, 500, "Failed to process resume.");
  }
};

// GET / — list all resumes
exports.list = (req, res) => {
  try {
    const resumes = resumeService.findAllByUser(req.user.id);
    return successResponse(res, { resumes });
  } catch (err) {
    console.error("Get resumes error:", err);
    return errorResponse(res, 500, "Failed to fetch resumes.");
  }
};

// GET /:id — single resume with experiences + education
exports.getOne = (req, res) => {
  try {
    const resume = resumeService.findByIdAndUser(req.params.id, req.user.id);
    if (!resume) return errorResponse(res, 404, "Resume not found.");

    const experiences = resumeService.getExperiences(resume.id);
    const education = resumeService.getEducation(resume.id);

    return successResponse(res, { resume: { ...resume, experiences, education } });
  } catch (err) {
    console.error("Get resume error:", err);
    return errorResponse(res, 500, "Failed to fetch resume.");
  }
};

// PUT /:id — update resume
exports.update = (req, res) => {
  try {
    const resume = resumeService.findByIdAndUser(req.params.id, req.user.id);
    if (!resume) return errorResponse(res, 404, "Resume not found.");

    const { full_name, email, phone, summary, skills, experiences, education } = req.body || {};
    const skillsStr = Array.isArray(skills) ? skills.join(", ") : (skills || resume.skills);

    resumeService.updateResume(resume.id, full_name || resume.full_name, email || resume.email, phone || resume.phone, summary || resume.summary, skillsStr);

    // Replace experiences if provided
    if (Array.isArray(experiences)) {
      resumeService.deleteExperiences(resume.id);
      resumeService.insertExperiences(resume.id, experiences);
    }

    if (Array.isArray(education)) {
      resumeService.deleteEducation(resume.id);
      resumeService.insertEducation(resume.id, education);
    }

    return successResponse(res, { message: "Resume updated" });
  } catch (err) {
    console.error("Update resume error:", err);
    return errorResponse(res, 500, "Failed to update resume.");
  }
};

// DELETE /:id
exports.remove = (req, res) => {
  try {
    const resume = resumeService.findByIdAndUser(req.params.id, req.user.id);
    if (!resume) return errorResponse(res, 404, "Resume not found.");

    resumeService.remove(resume.id);
    return successResponse(res, { message: "Resume deleted" });
  } catch (err) {
    console.error("Delete resume error:", err);
    return errorResponse(res, 500, "Failed to delete resume.");
  }
};

// POST /:id/optimize — Gemini AI optimization + scoring
exports.optimize = async (req, res) => {
  try {
    const resume = resumeService.findByIdAndUser(req.params.id, req.user.id);
    if (!resume) return errorResponse(res, 404, "Resume not found.");

    const experiences = resumeService.getExperiences(resume.id);
    const education = resumeService.getEducation(resume.id);

    const result = await optimizeResume({ ...resume, experiences, education });

    // Write scores back to DB
    const suggestedStr = Array.isArray(result.suggested_skills) ? result.suggested_skills.join(", ") : "";
    resumeService.updateScores(resume.id, result.ats_score, result.keyword_score, result.content_score, result.optimized_summary, suggestedStr);

    // Write improved experience descriptions
    if (Array.isArray(result.improved_experiences)) {
      for (const imp of result.improved_experiences) {
        const exp = experiences.find((e) => e.description === imp.original);
        if (exp) {
          resumeService.updateImprovedDescription(exp.id, imp.improved);
        }
      }
    }

    // Restructure for frontend: expects scores object, improvements array, experience_bullets
    const ats = result.ats_score || 0;
    const keyword = result.keyword_score || 0;
    const content = result.content_score || 0;
    const overall = Math.round((ats + keyword + content) / 3);
    const optimization = {
      scores: { ats, keyword, content, overall },
      optimized_summary: result.optimized_summary || "",
      suggested_skills: result.suggested_skills || [],
      improvements: result.tips || [],
      experience_bullets: Array.isArray(result.improved_experiences)
        ? result.improved_experiences.map(e => ({ original: e.original, bullets: [e.improved] }))
        : [],
    };

    return successResponse(res, { message: "Resume optimized", optimization });
  } catch (err) {
    console.error("Optimize error:", err.message || err);
    if (err.message && err.message.includes("API key")) return errorResponse(res, 503, "AI service not configured. Set a valid GEMINI_API_KEY.");
    return errorResponse(res, 500, "Failed to optimize resume.");
  }
};

// PATCH /:id/primary — set as primary resume
exports.setPrimary = (req, res) => {
  try {
    const resume = resumeService.findByIdAndUser(req.params.id, req.user.id);
    if (!resume) return errorResponse(res, 404, "Resume not found.");

    // Unset all, then set this one
    resumeService.unsetAllPrimary(req.user.id);
    resumeService.setPrimary(resume.id);

    return successResponse(res, { message: "Primary resume updated" });
  } catch (err) {
    console.error("Set primary error:", err);
    return errorResponse(res, 500, "Failed to update primary resume.");
  }
};
