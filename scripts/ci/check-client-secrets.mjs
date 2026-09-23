import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2);
const targets = roots.length ? roots : ["frontend/src", "backend/src"];
const findings = [];
const patterns = [
  { name: "Groq key", regex: /gsk_[A-Za-z0-9_-]{16,}/g },
  { name: "OpenRouter key", regex: /sk-or-[A-Za-z0-9_-]{16,}/g },
  { name: "Google API key in JavaScript", regex: /AIza[A-Za-z0-9_-]{24,}/g },
  { name: "client-side privileged AI environment variable", regex: /EXPO_PUBLIC_(?:GROQ|GEMINI|OPENROUTER)_API_KEY/g },
  { name: "split provider-key prefix", regex: /["'](?:gsk_|sk-or-)["']\s*[,;+]/g }
];

function visit(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) visit(path.join(target, entry));
    return;
  }
  if (!/\.(?:js|jsx|mjs|cjs|html)$/.test(target)) return;
  const text = fs.readFileSync(target, "utf8");
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(text)) findings.push(`${target}: ${pattern.name}`);
  }
}

targets.forEach(visit);
if (findings.length) {
  console.error("Privileged credential material must not be present in source or client bundles:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log(`Client credential scan passed for: ${targets.join(", ")}`);
