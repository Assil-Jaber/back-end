const db = require("../db");

exports.findUserByEmail = (email) => {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
};

exports.findUserIdByEmail = (email) => {
  return db.prepare("SELECT id FROM users WHERE email = ?").get(email);
};

exports.createUser = (name, email, hashedPassword) => {
  return db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hashedPassword);
};

exports.findUserById = (id) => {
  return db.prepare("SELECT id, name, email, plan, created_at FROM users WHERE id = ?").get(id);
};

exports.findFullUserById = (id) => {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
};

exports.updateUserName = (name, userId) => {
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, userId);
};

exports.updatePassword = (hashedPassword, userId) => {
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, userId);
};

exports.getPreferences = (userId) => {
  return db.prepare("SELECT * FROM job_preferences WHERE user_id = ?").get(userId);
};

exports.upsertPreferences = (userId, desired_title, desired_location, desired_type, min_salary) => {
  const existing = db.prepare("SELECT id FROM job_preferences WHERE user_id = ?").get(userId);
  if (existing) {
    db.prepare(
      `UPDATE job_preferences SET desired_title = COALESCE(?, desired_title), desired_location = COALESCE(?, desired_location), desired_type = COALESCE(?, desired_type), min_salary = COALESCE(?, min_salary) WHERE user_id = ?`
    ).run(desired_title || null, desired_location || null, desired_type || null, min_salary || null, userId);
  } else {
    db.prepare(
      "INSERT INTO job_preferences (user_id, desired_title, desired_location, desired_type, min_salary) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, desired_title || null, desired_location || null, desired_type || null, min_salary || null);
  }
};

exports.getStats = (userId) => {
  const resumeCount = db.prepare("SELECT COUNT(*) as c FROM resumes WHERE user_id = ?").get(userId).c;
  const applicationCount = db.prepare("SELECT COUNT(*) as c FROM applications WHERE user_id = ?").get(userId).c;
  const savedCount = db.prepare("SELECT COUNT(*) as c FROM saved_jobs WHERE user_id = ?").get(userId).c;
  const coverLetterCount = db.prepare("SELECT COUNT(*) as c FROM cover_letters WHERE user_id = ?").get(userId).c;
  const coachSessionCount = db.prepare("SELECT COUNT(*) as c FROM coach_sessions WHERE user_id = ?").get(userId).c;
  return { resumes: resumeCount, applications: applicationCount, saved_jobs: savedCount, cover_letters: coverLetterCount, coach_sessions: coachSessionCount };
};

exports.createRefreshToken = (token, userId, expiresAt) => {
  db.prepare("INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
};

exports.findRefreshToken = (token) => {
  return db.prepare("SELECT * FROM refresh_tokens WHERE token = ?").get(token);
};

exports.deleteRefreshTokenById = (id) => {
  db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(id);
};

exports.deleteRefreshTokenByToken = (token) => {
  db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(token);
};

exports.findUserEmailById = (id) => {
  return db.prepare("SELECT id, email FROM users WHERE id = ?").get(id);
};
