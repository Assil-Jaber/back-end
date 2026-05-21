const db = require("../db");

exports.create = (userId, job_title, company, tone, content) => {
  return db.prepare(
    "INSERT INTO cover_letters (user_id, job_title, company, tone, content) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, job_title, company, tone, content);
};

exports.findAllByUser = (userId) => {
  return db.prepare("SELECT * FROM cover_letters WHERE user_id = ? ORDER BY created_at DESC").all(userId);
};

exports.findByIdAndUser = (id, userId) => {
  return db.prepare("SELECT * FROM cover_letters WHERE id = ? AND user_id = ?").get(id, userId);
};

exports.remove = (id) => {
  db.prepare("DELETE FROM cover_letters WHERE id = ?").run(id);
};

exports.getResumeSkills = (resumeId, userId) => {
  return db.prepare("SELECT skills FROM resumes WHERE id = ? AND user_id = ?").get(resumeId, userId);
};

exports.getPrimaryResumeSkills = (userId) => {
  return db.prepare("SELECT skills FROM resumes WHERE user_id = ? AND is_primary = 1").get(userId)
    || db.prepare("SELECT skills FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);
};
