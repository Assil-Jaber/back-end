const db = require("../db");

// ── Cache Adzuna jobs locally (so save/apply foreign keys work) ──────

exports.cacheJobs = (jobs) => {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO jobs (id, title, company, location, type, description, requirements, salary, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((list) => {
    for (const j of list) {
      upsert.run(j.id, j.title, j.company, j.location, j.type, j.description, j.requirements, j.salary, j.posted_at);
    }
  });
  insertMany(jobs);
};

// ── Query helpers (used for saved/applied which reference cached data) ──

exports.findFiltered = (title, location, type, limit, offset) => {
  let sql = "SELECT * FROM jobs WHERE 1=1";
  const params = [];

  if (title) { sql += " AND title LIKE ?"; params.push(`%${title}%`); }
  if (location) { sql += " AND location LIKE ?"; params.push(`%${location}%`); }
  if (type) { sql += " AND type = ?"; params.push(type); }

  sql += " ORDER BY posted_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
};

exports.countAll = () => {
  return db.prepare("SELECT COUNT(*) as c FROM jobs").get().c;
};

exports.findById = (id) => {
  return db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
};

exports.findJobExists = (id) => {
  return db.prepare("SELECT id FROM jobs WHERE id = ?").get(id);
};

exports.findSavedByUser = (userId) => {
  return db.prepare(
    "SELECT j.*, sj.created_at as saved_at FROM saved_jobs sj JOIN jobs j ON sj.job_id = j.id WHERE sj.user_id = ? ORDER BY sj.created_at DESC"
  ).all(userId);
};

exports.findApplicationsByUser = (userId) => {
  return db.prepare(
    "SELECT a.*, j.title, j.company, j.location FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.user_id = ? ORDER BY a.created_at DESC"
  ).all(userId);
};

exports.findSavedJob = (userId, jobId) => {
  return db.prepare("SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?").get(userId, jobId);
};

exports.saveJob = (userId, jobId) => {
  db.prepare("INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)").run(userId, jobId);
};

exports.unsaveJob = (id) => {
  db.prepare("DELETE FROM saved_jobs WHERE id = ?").run(id);
};

exports.findApplication = (userId, jobId) => {
  return db.prepare("SELECT id FROM applications WHERE user_id = ? AND job_id = ?").get(userId, jobId);
};

exports.findApplicationByIdAndUser = (id, userId) => {
  return db.prepare("SELECT * FROM applications WHERE id = ? AND user_id = ?").get(id, userId);
};

exports.createApplication = (userId, jobId, resumeId, coverNote) => {
  db.prepare("INSERT INTO applications (user_id, job_id, resume_id, cover_note) VALUES (?, ?, ?, ?)")
    .run(userId, jobId, resumeId, coverNote);
};

exports.updateApplicationStatus = (status, id) => {
  db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, id);
};

exports.findAllForMatching = () => {
  return db.prepare("SELECT * FROM jobs ORDER BY posted_at DESC LIMIT 100").all();
};
