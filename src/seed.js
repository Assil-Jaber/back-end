const db = require("./db");

// Jobs are now fetched from Adzuna API in real-time.
// This seed file is no longer needed for job data.
// The jobs table is used as a cache for Adzuna results (for saved/applied references).

console.log("No mock jobs to seed — jobs are fetched live from Adzuna API.");
