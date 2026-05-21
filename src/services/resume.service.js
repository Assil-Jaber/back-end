const db = require("../db");

exports.create = (userId, full_name, email, phone, summary, skills) => {
  return db.prepare(
    "INSERT INTO resumes (user_id, full_name, email, phone, summary, skills) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, full_name, email || null, phone || null, summary || null, skills);
};

exports.insertExperiences = (resumeId, experiences) => {
  const stmt = db.prepare(
    "INSERT INTO resume_experiences (resume_id, company, title, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const exp of experiences) {
    stmt.run(resumeId, exp.company || null, exp.title || null, exp.start_date || null, exp.end_date || null, exp.description || null);
  }
};

exports.insertEducation = (resumeId, education) => {
  const stmt = db.prepare(
    "INSERT INTO resume_education (resume_id, school, degree, field, year) VALUES (?, ?, ?, ?, ?)"
  );
  for (const edu of education) {
    stmt.run(resumeId, edu.school || null, edu.degree || null, edu.field || null, edu.year || null);
  }
};

exports.findAllByUser = (userId) => {
  return db.prepare("SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC").all(userId);
};

exports.findByIdAndUser = (id, userId) => {
  return db.prepare("SELECT * FROM resumes WHERE id = ? AND user_id = ?").get(id, userId);
};

exports.getExperiences = (resumeId) => {
  return db.prepare("SELECT * FROM resume_experiences WHERE resume_id = ?").all(resumeId);
};

exports.getEducation = (resumeId) => {
  return db.prepare("SELECT * FROM resume_education WHERE resume_id = ?").all(resumeId);
};

exports.updateResume = (id, full_name, email, phone, summary, skills) => {
  db.prepare("UPDATE resumes SET full_name = ?, email = ?, phone = ?, summary = ?, skills = ? WHERE id = ?")
    .run(full_name, email, phone, summary, skills, id);
};

exports.deleteExperiences = (resumeId) => {
  db.prepare("DELETE FROM resume_experiences WHERE resume_id = ?").run(resumeId);
};

exports.deleteEducation = (resumeId) => {
  db.prepare("DELETE FROM resume_education WHERE resume_id = ?").run(resumeId);
};

exports.remove = (id) => {
  db.prepare("DELETE FROM resumes WHERE id = ?").run(id);
};

exports.updateScores = (id, ats_score, keyword_score, content_score, optimized_summary, suggested_skills) => {
  db.prepare(
    "UPDATE resumes SET ats_score = ?, keyword_score = ?, content_score = ?, optimized_summary = ?, suggested_skills = ? WHERE id = ?"
  ).run(ats_score, keyword_score, content_score, optimized_summary, suggested_skills, id);
};

exports.updateImprovedDescription = (id, improved) => {
  db.prepare("UPDATE resume_experiences SET improved_description = ? WHERE id = ?").run(improved, id);
};

exports.unsetAllPrimary = (userId) => {
  db.prepare("UPDATE resumes SET is_primary = 0 WHERE user_id = ?").run(userId);
};

exports.setPrimary = (id) => {
  db.prepare("UPDATE resumes SET is_primary = 1 WHERE id = ?").run(id);
};

exports.findPrimaryOrLatest = (userId) => {
  return db.prepare("SELECT * FROM resumes WHERE user_id = ? AND is_primary = 1").get(userId)
    || db.prepare("SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);
};
