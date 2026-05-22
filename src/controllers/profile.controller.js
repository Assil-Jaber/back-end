const profileService = require("../services/profile.service");
const { analyzeLinkedIn } = require("../services/gemini");
const { errorResponse, successResponse } = require("../utils/response");

// Fake LinkedIn profile data (no real OAuth)
const FAKE_PROFILE = {
  name: "Assil Jaber",
  headline: "Computer Science Student at Beirut Arab University",
  email: "assiljaber8@gmail.com",
  url: "https://linkedin.com/in/assil-jaber",
};

// GET /auth-url — return fake OAuth URL
exports.getAuthUrl = (req, res) => {
  return successResponse(res, {
    message: "LinkedIn OAuth is simulated. Call POST /callback to connect.",
    authUrl: "https://linkedin.com/oauth/fake-simulated",
  });
};

// POST /callback — simulate OAuth callback, store fake profile
exports.callback = (req, res) => {
  try {
    profileService.connectLinkedIn(FAKE_PROFILE.url, req.user.id);

    return successResponse(res, {
      message: "LinkedIn connected (simulated)",
      profile: FAKE_PROFILE,
    });
  } catch (err) {
    console.error("LinkedIn callback error:", err);
    return errorResponse(res, 500, "Failed to connect LinkedIn.");
  }
};

// POST /analyze — analyze profile with Gemini
exports.analyze = async (req, res) => {
  try {
    const user = profileService.getUserById(req.user.id);
    if (!user.linkedin_connected) return errorResponse(res, 400, "Connect LinkedIn first (POST /api/linkedin/callback).");

    // Use request body data (from manual form) or fall back to fake profile
    const profile = {
      name: user.name || FAKE_PROFILE.name,
      headline: req.body.headline || FAKE_PROFILE.headline,
      email: user.email || FAKE_PROFILE.email,
      about: req.body.about || "",
      industry: req.body.industry || "Technology",
      skills: req.body.skills || [],
      profile_url: req.body.profile_url || FAKE_PROFILE.url,
    };

    const analysis = await analyzeLinkedIn(profile);

    // Compute overall_score if not provided
    if (!analysis.overall_score) {
      analysis.overall_score = Math.round(
        (analysis.completeness_score + analysis.headline_score + analysis.keyword_score) / 3
      );
    }

    // Ensure suggestions are structured objects for the frontend
    if (analysis.suggestions && analysis.suggestions.length && typeof analysis.suggestions[0] === "string") {
      analysis.suggestions = analysis.suggestions.map((s, i) => ({
        type: i === 0 ? "warning" : "tip",
        title: s.length > 50 ? s.substring(0, 50) + "..." : s,
        description: s,
      }));
    }

    // Store analysis
    profileService.saveAnalysis(req.user.id, analysis.completeness_score, analysis.headline_score, analysis.keyword_score, analysis.suggestions, analysis.improved_headline);

    return successResponse(res, { analysis });
  } catch (err) {
    console.error("LinkedIn analyze error:", err.message || err);
    if (err.message && err.message.includes("API key")) return errorResponse(res, 503, "AI service not configured. Set a valid GEMINI_API_KEY.");
    return errorResponse(res, 500, "Failed to analyze LinkedIn profile.");
  }
};

// GET /history — past analyses
exports.getHistory = (req, res) => {
  try {
    const analyses = profileService.getAnalyses(req.user.id);
    // Parse JSON suggestions
    const parsed = analyses.map((a) => ({ ...a, suggestions: JSON.parse(a.suggestions || "[]") }));
    return successResponse(res, { analyses: parsed });
  } catch (err) {
    console.error("LinkedIn history error:", err);
    return errorResponse(res, 500, "Failed to fetch history.");
  }
};

// GET /status — connection status
exports.getStatus = (req, res) => {
  try {
    const user = profileService.getStatus(req.user.id);
    return successResponse(res, { connected: !!user.linkedin_connected, url: user.linkedin_url || null });
  } catch (err) {
    console.error("LinkedIn status error:", err);
    return errorResponse(res, 500, "Failed to fetch status.");
  }
};

// DELETE /disconnect
exports.disconnect = (req, res) => {
  try {
    profileService.disconnectLinkedIn(req.user.id);
    return successResponse(res, { message: "LinkedIn disconnected" });
  } catch (err) {
    console.error("LinkedIn disconnect error:", err);
    return errorResponse(res, 500, "Failed to disconnect LinkedIn.");
  }
};
