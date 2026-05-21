const db = require("../db");

exports.connectLinkedIn = (url, userId) => {
  db.prepare("UPDATE users SET linkedin_connected = 1, linkedin_url = ? WHERE id = ?").run(url, userId);
};

exports.disconnectLinkedIn = (userId) => {
  db.prepare("UPDATE users SET linkedin_connected = 0, linkedin_url = NULL WHERE id = ?").run(userId);
};

exports.getUserById = (id) => {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
};

exports.getStatus = (userId) => {
  return db.prepare("SELECT linkedin_connected, linkedin_url FROM users WHERE id = ?").get(userId);
};

exports.saveAnalysis = (userId, completeness_score, headline_score, keyword_score, suggestions, improved_headline) => {
  db.prepare(
    "INSERT INTO linkedin_analyses (user_id, completeness_score, headline_score, keyword_score, suggestions, improved_headline) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, completeness_score, headline_score, keyword_score, JSON.stringify(suggestions), improved_headline);
};

exports.getAnalyses = (userId) => {
  return db.prepare("SELECT * FROM linkedin_analyses WHERE user_id = ? ORDER BY created_at DESC").all(userId);
};
