const coachService = require("../services/coach.service");
const { coachReply } = require("../services/gemini");
const { errorResponse, successResponse } = require("../utils/response");

// POST / — create a new coach session
exports.createSession = (req, res) => {
  try {
    const { topic } = req.body || {};
    const title = topic || "General Career Advice";
    const result = coachService.createSession(req.user.id, title);
    return successResponse(res, { message: "Session created", session: { id: Number(result.lastInsertRowid), title } }, 201);
  } catch (err) {
    console.error("Create session error:", err);
    return errorResponse(res, 500, "Failed to create session.");
  }
};

// POST /:id/messages — send a message, get AI reply
exports.sendMessage = async (req, res) => {
  try {
    const session = coachService.findSessionByIdAndUser(req.params.id, req.user.id);
    if (!session) return errorResponse(res, 404, "Session not found.");

    const { content } = req.body || {};
    if (!content || !content.trim()) return errorResponse(res, 400, "Message content is required.");

    // Save user message
    coachService.addMessage(session.id, "user", content.trim());

    // Get conversation history for context
    const history = coachService.getMessagesBySession(session.id);

    // Get AI response
    const aiResponse = await coachReply(history);

    // Save AI message
    coachService.addMessage(session.id, "assistant", aiResponse);

    return successResponse(res, {
      userMessage: { role: "user", content: content.trim() },
      aiMessage: { role: "assistant", content: aiResponse },
    });
  } catch (err) {
    console.error("Coach send error:", err.message || err);
    if (err.message && err.message.includes("API key")) return errorResponse(res, 503, "AI service not configured. Set a valid GEMINI_API_KEY.");
    return errorResponse(res, 500, "Failed to get coach response.");
  }
};

// GET / — list sessions
exports.getSessions = (req, res) => {
  try {
    const sessions = coachService.findSessionsByUser(req.user.id);
    return successResponse(res, { sessions });
  } catch (err) {
    console.error("Get sessions error:", err);
    return errorResponse(res, 500, "Failed to fetch sessions.");
  }
};

// GET /:id/messages — get messages for a session
exports.getMessages = (req, res) => {
  try {
    const session = coachService.findSessionByIdAndUser(req.params.id, req.user.id);
    if (!session) return errorResponse(res, 404, "Session not found.");

    const messages = coachService.getFullMessagesBySession(session.id);
    return successResponse(res, { session, messages });
  } catch (err) {
    console.error("Get messages error:", err);
    return errorResponse(res, 500, "Failed to fetch messages.");
  }
};
