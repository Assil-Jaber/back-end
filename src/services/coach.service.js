const db = require("../db");

exports.createSession = (userId, title) => {
  return db.prepare("INSERT INTO coach_sessions (user_id, title) VALUES (?, ?)").run(userId, title);
};

exports.findSessionByIdAndUser = (id, userId) => {
  return db.prepare("SELECT * FROM coach_sessions WHERE id = ? AND user_id = ?").get(id, userId);
};

exports.findSessionsByUser = (userId) => {
  return db.prepare("SELECT * FROM coach_sessions WHERE user_id = ? ORDER BY created_at DESC").all(userId);
};

exports.addMessage = (sessionId, role, content) => {
  db.prepare("INSERT INTO coach_messages (session_id, role, content) VALUES (?, ?, ?)").run(sessionId, role, content);
};

exports.getMessagesBySession = (sessionId) => {
  return db.prepare("SELECT role, content FROM coach_messages WHERE session_id = ? ORDER BY created_at ASC").all(sessionId);
};

exports.getFullMessagesBySession = (sessionId) => {
  return db.prepare("SELECT * FROM coach_messages WHERE session_id = ? ORDER BY created_at ASC").all(sessionId);
};
