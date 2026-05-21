const coverLetterService = require("../services/coverLetter.service");
const { generateCoverLetter } = require("../services/gemini");
const { errorResponse, successResponse } = require("../utils/response");

// POST /generate — generate with Gemini
exports.generate = async (req, res) => {
  try {
    const { resume_id, job_title, company, tone } = req.body || {};

    if (!job_title || !company) return errorResponse(res, 400, "job_title and company are required.");

    // Grab skills from resume (optional, uses primary or provided)
    let skills = "";
    if (resume_id) {
      const resume = coverLetterService.getResumeSkills(resume_id, req.user.id);
      if (!resume) return errorResponse(res, 404, "Resume not found.");
      skills = resume.skills || "";
    } else {
      const primary = coverLetterService.getPrimaryResumeSkills(req.user.id);
      if (primary) skills = primary.skills || "";
    }

    const content = await generateCoverLetter(skills, job_title, company, tone);

    const result = coverLetterService.create(req.user.id, job_title, company, tone || "professional", content);

    return successResponse(res, {
      message: "Cover letter generated",
      coverLetter: { id: Number(result.lastInsertRowid), job_title, company, tone: tone || "professional", content },
    }, 201);
  } catch (err) {
    console.error("Generate cover letter error:", err.message || err);
    if (err.message && err.message.includes("API key")) return errorResponse(res, 503, "AI service not configured. Set a valid GEMINI_API_KEY.");
    return errorResponse(res, 500, "Failed to generate cover letter.");
  }
};

// GET / — list all cover letters
exports.list = (req, res) => {
  try {
    const letters = coverLetterService.findAllByUser(req.user.id);
    return successResponse(res, { coverLetters: letters });
  } catch (err) {
    console.error("List cover letters error:", err);
    return errorResponse(res, 500, "Failed to fetch cover letters.");
  }
};

// GET /:id
exports.getOne = (req, res) => {
  try {
    const letter = coverLetterService.findByIdAndUser(req.params.id, req.user.id);
    if (!letter) return errorResponse(res, 404, "Cover letter not found.");
    return successResponse(res, { coverLetter: letter });
  } catch (err) {
    console.error("Get cover letter error:", err);
    return errorResponse(res, 500, "Failed to fetch cover letter.");
  }
};

// DELETE /:id
exports.remove = (req, res) => {
  try {
    const letter = coverLetterService.findByIdAndUser(req.params.id, req.user.id);
    if (!letter) return errorResponse(res, 404, "Cover letter not found.");

    coverLetterService.remove(letter.id);
    return successResponse(res, { message: "Cover letter deleted" });
  } catch (err) {
    console.error("Delete cover letter error:", err);
    return errorResponse(res, 500, "Failed to delete cover letter.");
  }
};
