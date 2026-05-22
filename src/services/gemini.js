const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// ── Helper: call Gemini and parse JSON response ──
async function geminiJSON(prompt) {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

async function geminiText(prompt) {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ── 1. Parse resume text → structured JSON ──
async function parseResume(text) {
  const prompt = `Extract structured information from this resume text. Return ONLY valid JSON with no markdown backticks or extra text.

The JSON must have this exact structure:
{
  "full_name": "string",
  "email": "string or null",
  "phone": "string or null",
  "summary": "brief professional summary string",
  "skills": ["skill1", "skill2", ...],
  "experiences": [
    {
      "company": "string",
      "title": "string",
      "start_date": "string",
      "end_date": "string or Present",
      "description": "string"
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "field": "string",
      "year": "string"
    }
  ]
}

Resume text:
${text}`;

  return geminiJSON(prompt);
}

// ── 2. Optimize resume — scores + improvements ──
async function optimizeResume(resume) {
  const prompt = `You are an expert ATS resume reviewer. Analyze this resume and return ONLY valid JSON:

{
  "ats_score": <number 0-100>,
  "keyword_score": <number 0-100>,
  "content_score": <number 0-100>,
  "optimized_summary": "improved professional summary",
  "suggested_skills": ["skill1", "skill2"],
  "improved_experiences": [
    {
      "original": "original description",
      "improved": "STAR-format improved bullet"
    }
  ],
  "tips": ["tip1", "tip2", "tip3"]
}

Resume:
Name: ${resume.full_name}
Summary: ${resume.summary}
Skills: ${resume.skills}
Experiences: ${JSON.stringify(resume.experiences)}
Education: ${JSON.stringify(resume.education)}`;

  return geminiJSON(prompt);
}

// ── 3. Generate cover letter ──
async function generateCoverLetter(resumeSkills, jobTitle, company, tone) {
  const prompt = `Write a professional cover letter for a "${jobTitle}" position at "${company}".

Tone: ${tone || "professional"} (options: professional, confident, enthusiastic)

Candidate skills: ${resumeSkills}

Return ONLY the cover letter text. No JSON. No markdown. Just the letter ready to send.`;

  return geminiText(prompt);
}

// ── 4. AI Coach — career advice chat ──
async function coachReply(messages) {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const systemPrompt = `You are Hirely Coach, a friendly and knowledgeable AI career advisor. 
You help with resumes, interview prep, job searching strategy, salary negotiation, and career transitions.
Keep answers concise, practical, and encouraging. Use bullet points when listing tips.
If asked about something unrelated to careers, politely redirect to career topics.`;

  const history = messages.map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`).join("\n");

  const prompt = `${systemPrompt}\n\nConversation:\n${history}\n\nCoach:`;

  return geminiText(prompt);
}

// ── 5. Analyze LinkedIn profile ──
async function analyzeLinkedIn(profile) {
  const prompt = `Analyze this LinkedIn profile and return ONLY valid JSON:

{
  "completeness_score": <number 0-100>,
  "headline_score": <number 0-100>,
  "keyword_score": <number 0-100>,
  "overall_score": <number 0-100>,
  "suggestions": [
    {"type": "warning", "title": "Short title", "description": "Detailed suggestion"},
    {"type": "tip", "title": "Short title", "description": "Detailed suggestion"},
    {"type": "success", "title": "Short title", "description": "What they did well"}
  ],
  "improved_headline": "a better headline for this person"
}

Profile:
Name: ${profile.name || "Unknown"}
Headline: ${profile.headline || "No headline"}
About: ${profile.about || "No about section"}
Industry: ${profile.industry || "Not specified"}
Skills: ${Array.isArray(profile.skills) ? profile.skills.join(", ") : profile.skills || "None listed"}
Email: ${profile.email || ""}`;

  return geminiJSON(prompt);
}

// ── 6. Keyword match resume ↔ jobs ──
function matchResumeToJobs(skills, jobs) {
  const userSkills = skills.map((s) => s.toLowerCase().trim());

  const scored = jobs.map((job) => {
    const reqText = (job.requirements || "").toLowerCase();
    let matches = 0;

    for (const skill of userSkills) {
      if (reqText.includes(skill)) {
        matches++;
      }
    }

    const score =
      userSkills.length > 0
        ? Math.round((matches / userSkills.length) * 100)
        : 0;

    return { ...job, match_score: score, matched_skills: matches };
  });

  scored.sort((a, b) => b.match_score - a.match_score);
  return scored;
}

module.exports = {
  parseResume,
  optimizeResume,
  generateCoverLetter,
  coachReply,
  analyzeLinkedIn,
  matchResumeToJobs,
};
