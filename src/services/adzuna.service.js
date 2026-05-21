const https = require("https");

const APP_ID = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;
const BASE_URL = "api.adzuna.com";

/**
 * Search jobs on Adzuna API
 * @param {Object} options
 * @param {string} options.title - Job title / keywords
 * @param {string} options.location - Location query
 * @param {string} options.type - full-time, part-time, contract
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Results per page (max 50)
 * @param {string} options.country - Country code (gb, us, lb, ae, sa, etc.)
 * @returns {Promise<{jobs: Array, total: number}>}
 */
exports.searchJobs = ({ title, location, type, page = 1, limit = 20, country = "gb" }) => {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      app_id: APP_ID,
      app_key: APP_KEY,
      results_per_page: String(Math.min(limit, 50)),
    });

    if (title) params.append("what", title);
    if (location) params.append("where", location);
    if (type === "full-time") params.append("full_time", "1");
    if (type === "part-time") params.append("part_time", "1");
    if (type === "contract") params.append("contract", "1");

    const path = `/v1/api/jobs/${country}/search/${page}?${params.toString()}`;

    const options = {
      hostname: BASE_URL,
      path,
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            return reject(new Error(parsed.error || `Adzuna API error: ${res.statusCode}`));
          }
          const jobs = (parsed.results || []).map(mapAdzunaJob);
          resolve({ jobs, total: parsed.count || 0 });
        } catch (e) {
          reject(new Error("Failed to parse Adzuna response"));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
};

/**
 * Map Adzuna API response to our job format
 */
function mapAdzunaJob(item) {
  return {
    id: item.id,
    title: item.title || "",
    company: item.company?.display_name || "Unknown",
    location: item.location?.display_name || "",
    type: detectType(item),
    description: item.description || "",
    requirements: item.category?.label || "",
    salary: formatSalary(item.salary_min, item.salary_max),
    posted_at: item.created || new Date().toISOString(),
    redirect_url: item.redirect_url || "",
  };
}

function detectType(item) {
  if (item.contract_time === "full_time") return "full-time";
  if (item.contract_time === "part_time") return "part-time";
  if (item.contract_type === "contract") return "contract";
  return "full-time";
}

function formatSalary(min, max) {
  if (!min && !max) return "Not specified";
  if (min && max) return `$${Math.round(min).toLocaleString()} – $${Math.round(max).toLocaleString()}/yr`;
  if (min) return `From $${Math.round(min).toLocaleString()}/yr`;
  return `Up to $${Math.round(max).toLocaleString()}/yr`;
}
