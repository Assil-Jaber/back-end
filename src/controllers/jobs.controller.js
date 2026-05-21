const jobsService = require("../services/jobs.service");
const adzunaService = require("../services/adzuna.service");
const resumeService = require("../services/resume.service");
const { matchResumeToJobs } = require("../services/gemini");
const { errorResponse, successResponse } = require("../utils/response");

// GET / — list jobs from Adzuna (with optional filters)
exports.list = async (req, res) => {
  try {
    const { title, location, type, page = 1, limit = 20, country = "gb" } = req.query;

    const lim = Math.min(parseInt(limit) || 20, 50);
    const pg = Math.max(parseInt(page) || 1, 1);

    const { jobs, total } = await adzunaService.searchJobs({
      title,
      location,
      type,
      page: pg,
      limit: lim,
      country,
    });

    // Cache results locally so save/apply work
    if (jobs.length > 0) {
      jobsService.cacheJobs(jobs);
    }

    return successResponse(res, { jobs, total, page: pg, limit: lim });
  } catch (err) {
    console.error("List jobs error:", err);
    return errorResponse(res, 500, "Failed to fetch jobs.");
  }
};

// GET /matches — match Adzuna jobs to user's primary resume
exports.getMatches = async (req, res) => {
  try {
    const resume = resumeService.findPrimaryOrLatest(req.user.id);

    if (!resume) return errorResponse(res, 404, "No resume found. Upload one first.");

    const skills = resume.skills ? resume.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];

    // Fetch relevant jobs from Adzuna based on user skills
    const keyword = skills.slice(0, 3).join(" ");
    const { jobs } = await adzunaService.searchJobs({
      title: keyword,
      page: 1,
      limit: 50,
      country: req.query.country || "gb",
    });

    if (jobs.length === 0) return successResponse(res, { matches: [], message: "No jobs available yet." });

    // Cache for save/apply
    jobsService.cacheJobs(jobs);

    const matches = matchResumeToJobs(skills, jobs);
    return successResponse(res, { matches });
  } catch (err) {
    console.error("Matches error:", err);
    return errorResponse(res, 500, "Failed to fetch matches.");
  }
};

// GET /saved — user's saved jobs
exports.getSaved = (req, res) => {
  try {
    const saved = jobsService.findSavedByUser(req.user.id);
    return successResponse(res, { saved });
  } catch (err) {
    console.error("Saved jobs error:", err);
    return errorResponse(res, 500, "Failed to fetch saved jobs.");
  }
};

// GET /applications — user's applications
exports.getApplications = (req, res) => {
  try {
    const apps = jobsService.findApplicationsByUser(req.user.id);
    return successResponse(res, { applications: apps });
  } catch (err) {
    console.error("Applications error:", err);
    return errorResponse(res, 500, "Failed to fetch applications.");
  }
};

// GET /:id — single job
exports.getOne = (req, res) => {
  try {
    const job = jobsService.findById(req.params.id);
    if (!job) return errorResponse(res, 404, "Job not found.");
    return successResponse(res, { job });
  } catch (err) {
    console.error("Get job error:", err);
    return errorResponse(res, 500, "Failed to fetch job.");
  }
};

// POST /:id/save — toggle save
exports.toggleSave = (req, res) => {
  try {
    const job = jobsService.findJobExists(req.params.id);
    if (!job) return errorResponse(res, 404, "Job not found.");

    const existing = jobsService.findSavedJob(req.user.id, req.params.id);
    if (existing) {
      jobsService.unsaveJob(existing.id);
      return successResponse(res, { message: "Job unsaved", saved: false });
    }

    jobsService.saveJob(req.user.id, req.params.id);
    return successResponse(res, { message: "Job saved", saved: true }, 201);
  } catch (err) {
    console.error("Toggle save error:", err);
    return errorResponse(res, 500, "Failed to toggle save.");
  }
};

// POST /:id/apply
exports.apply = (req, res) => {
  try {
    const job = jobsService.findJobExists(req.params.id);
    if (!job) return errorResponse(res, 404, "Job not found.");

    const existing = jobsService.findApplication(req.user.id, req.params.id);
    if (existing) return errorResponse(res, 409, "Already applied to this job.");

    const { resume_id, cover_note } = req.body || {};

    jobsService.createApplication(req.user.id, req.params.id, resume_id || null, cover_note || null);

    return successResponse(res, { message: "Application submitted" }, 201);
  } catch (err) {
    console.error("Apply error:", err);
    return errorResponse(res, 500, "Failed to submit application.");
  }
};

// PATCH /applications/:id — update status
exports.updateApplication = (req, res) => {
  try {
    const { status } = req.body || {};
    const validStatuses = ["applied", "interviewing", "offered", "rejected", "withdrawn"];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, 400, `Status must be one of: ${validStatuses.join(", ")}`);
    }

    const app = jobsService.findApplicationByIdAndUser(req.params.id, req.user.id);
    if (!app) return errorResponse(res, 404, "Application not found.");

    jobsService.updateApplicationStatus(status, app.id);
    return successResponse(res, { message: "Application updated" });
  } catch (err) {
    console.error("Update application error:", err);
    return errorResponse(res, 500, "Failed to update application.");
  }
};
