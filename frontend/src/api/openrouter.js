const GROQ_API_KEY = "";
const GEMINI_API_KEY = "";

const GROQ_MODELS = [
  "groq/compound-mini",
  "groq/compound",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b"
];

const CANDIDATE_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-pro"
];

async function callGeminiApi(prompt) {
  if (GROQ_API_KEY) {
    for (const modelName of GROQ_MODELS) {
      try {
        const url = "https://api.groq.com/openai/v1/chat/completions";
        const requestBody = {
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 2500
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text && text.trim()) {
            console.log(`Groq API generated syllabus using model: ${modelName}`);
            return text.trim();
          }
        }
      } catch (err) {
        console.warn(`Groq model ${modelName} error:`, err.message);
      }
    }
  }

  for (const modelName of GEMINI_API_KEY ? CANDIDATE_MODELS : []) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          console.log(`Gemini API generated syllabus using model: ${modelName}`);
          return text.trim();
        }
      }
    } catch (err) {
      console.warn(`Gemini model ${modelName} syllabus error:`, err.message);
    }
  }
  return null;
}

export async function generateSyllabusWithAI(courseTitle, category = "TCM One Tech", duration = "20 Days") {
  const daysMatch = (duration || "").match(/(\d+)\s*(days?|weeks?)/i);
  let totalDays = 20;
  if (daysMatch) {
    const val = parseInt(daysMatch[1], 10);
    const unit = daysMatch[2].toLowerCase();
    totalDays = unit.startsWith("week") ? val * 7 : val;
  }
  totalDays = Math.min(Math.max(totalDays, 5), 45);

  const prompt = `You are an elite Senior Curriculum Architect at TCM One Academy (Decoding The Mind). Design an IN-DEPTH, highly specific, DAY-BY-DAY day-wise curriculum for a course titled "${courseTitle}" under category "${category}" planned for a total duration of "${totalDays} Days".

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${totalDays} Day-by-Day modules. Title each module clearly starting with "Day 1:", "Day 2:", "Day 3:", ..., "Day ${totalDays}:".
2. Every day module MUST contain 2 to 3 detailed practical lessons 100% SPECIFIC to "${courseTitle}". Mention specific tools, libraries, or frameworks of "${courseTitle}".

Return ONLY raw valid JSON (no markdown fences, no backticks, no conversational text):
{
  "modules": [
    {
      "id": "m1",
      "title": "Day 1: ${courseTitle} Foundations & Tooling Setup",
      "lessons": [
        "Lesson 1.1: Tooling & Environment Configuration",
        "Lesson 1.2: Essential Fundamentals & Core Syntax"
      ]
    },
    {
      "id": "m2",
      "title": "Day 2: ${courseTitle} Core Architecture & Logic",
      "lessons": [
        "Lesson 2.1: Key Architectural Patterns",
        "Lesson 2.2: Live API & State Management"
      ]
    }
  ]
}`;

  try {
    const rawContent = await callGeminiApi(prompt);
    if (rawContent) {
      const cleanedJson = rawContent
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanedJson);
      if (parsed && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
        return parsed.modules;
      }
    }
  } catch (error) {
    console.warn("Gemini Syllabus Generation failed, using dynamic N-Day fallback:", error);
  }

  // Dynamic N-Day Fallback Engine for all selected days (Day 1 to Day N)
  const dayTopicTemplates = [
    "Environment Setup & Tooling Configuration",
    "Core Foundations & Basic Architecture",
    "Essential Concepts & Practical Syntax",
    "Hands-on Component & Interface Design",
    "State Management & Data Flow Architecture",
    "API Connectivity & Asynchronous Data Fetching",
    "Backend Routing & Middleware Configuration",
    "Database Modeling & Schemas Design",
    "Authentication & Security Authorization",
    "Real-time Data Communication & WebSockets",
    "Error Handling & Boundary Strategies",
    "Automated Testing & Integration Suites",
    "Performance Tuning & Memory Optimization",
    "Cloud Hosting & DevOps Pipeline Setup",
    "Production Capstone Architecture & Deployment"
  ];

  const fallbackModules = [];
  for (let d = 1; d <= totalDays; d++) {
    const templateIdx = (d - 1) % dayTopicTemplates.length;
    const dayTopic = dayTopicTemplates[templateIdx];
    fallbackModules.push({
      id: `day_${d}_${Date.now()}`,
      title: `Day ${d}: ${dayTopic} for ${courseTitle}`,
      lessons: [
        `Lesson ${d}.1: ${dayTopic} Theory & Core Concepts`,
        `Lesson ${d}.2: Live Practical Hands-on Implementation`,
        `Lesson ${d}.3: Day ${d} Doubts Clearance & Practice Code`
      ]
    });
  }

  return fallbackModules;
}

export async function generateCourseOverviewInsightsWithAI(courseTitle, category = "TCM One Academy", level = "All Levels") {
  const prompt = `You are a Lead Career Counselor & Industry Analyst at TCM One Academy. Provide highly accurate, professional career and salary insights for a course titled "${courseTitle}" in category "${category}" for level "${level}".

Return ONLY raw valid JSON (no markdown fences, no backticks, no conversational text):
{
  "whyLearn": [
    "High Market Demand: Huge requirement for skilled ${courseTitle} professionals across IT, Tech & Product companies.",
    "Lucrative Salary & Growth: Offers high entry-level compensation with rapid annual appraisal rates.",
    "Practical Industry Skills: Hands-on mastery of modern tools, frameworks, and real-world project development."
  ],
  "salaryInsights": {
    "avgSalary": "₹6.5 LPA – ₹18.0 LPA",
    "hiringCompanies": ["TCS", "Google", "Amazon", "Infosys", "Top Startups"],
    "growthRate": "+28% YoY Industry Demand",
    "careerRoles": ["Software Developer", "Full Stack Engineer", "System Architect"]
  }
}`;

  try {
    const rawContent = await callGeminiApi(prompt);
    if (rawContent) {
      const cleanedJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);
      if (parsed && parsed.whyLearn && parsed.salaryInsights) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Gemini Overview Insights failed, using fallback:", error);
  }

  const titleLower = (courseTitle || "").toLowerCase();
  const isGovt = titleLower.includes("upsc") || titleLower.includes("ssc") || titleLower.includes("bank") || titleLower.includes("govt");
  const isNeetJee = titleLower.includes("neet") || titleLower.includes("jee") || titleLower.includes("board");

  if (isGovt) {
    return {
      whyLearn: [
        "Job Security & Prestige: High-paying, respected government officer positions with pension & medical benefits.",
        "Direct Public Impact: Play an active role in national administration, policymaking & governance.",
        "Structured Competitive Strategy: Clear exam syllabus with high return on dedicated practice."
      ],
      salaryInsights: {
        avgSalary: "₹56,100 – ₹2,25,000 / month",
        hiringCompanies: ["IAS / IPS Cadre", "Central Govt Ministries", "RBI / Public Banks", "SSC Officer Posts"],
        growthRate: "Top Govt Officer Cadre",
        careerRoles: ["Civil Servant", "Banking Officer", "Govt Section Officer"]
      }
    };
  }

  if (isNeetJee) {
    return {
      whyLearn: [
        "Premier College Admission: Secure seats in AIIMS, IITs, NITs & top government medical/engineering colleges.",
        "High-Yield MCQ Mastery: Master speed & accuracy tricks to solve 180+ questions error-free.",
        "Strong Professional Foundation: Essential for lucrative medical & engineering careers."
      ],
      salaryInsights: {
        avgSalary: "Top Tier Medical & IIT Placements",
        hiringCompanies: ["AIIMS / Hospitals", "Google", "Microsoft", "Top Global R&D"],
        growthRate: "Top 1% Career Path",
        careerRoles: ["Medical Specialist", "IIT Engineer", "R&D Scientist"]
      }
    };
  }

  return {
    whyLearn: [
      `High Industry Demand: Companies actively seek skilled ${courseTitle} engineers with portfolio projects.`,
      `Lucrative Salary Packages: Starting packages range from ₹6.5 LPA up to ₹18 LPA for skilled professionals.`,
      `Hands-on Portfolio Building: Build production-grade projects to showcase directly to recruiters.`
    ],
    salaryInsights: {
      avgSalary: "₹6.5 LPA – ₹18.0 LPA",
      hiringCompanies: ["Google", "TCS", "Amazon", "Infosys", "Tech Startups"],
      growthRate: "+28% YoY Demand",
      careerRoles: [`${courseTitle} Engineer`, "Software Architect", "Technical Specialist"]
    }
  };
}
