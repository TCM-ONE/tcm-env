const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const GROQ_MODELS = [
  "groq/compound-mini",
  "groq/compound",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b"
];

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

export async function askGeminiAi(prompt, systemInstruction = "") {
  const cleanPrompt = (prompt || "").trim();
  if (!cleanPrompt) return generateSmartAcademicFallback("Explain this doubt");

  const defaultSystemMsg = `You are Phlappy AI (TCM One Phlappy AI 🤖), a friendly, highly intelligent expert academic and coding tutor at TCM One Academy.

INSTRUCTIONS FOR PHLAPPY AI:
1. Identify yourself as Phlappy AI if asked.
2. Adapt to the student's language naturally (Hinglish/Hindi/English). If the student asks in Hinglish (e.g. "mujhe batao ki html ka code likh kar", "Python smjhao", "kaise kare"), answer in clear, friendly Hinglish with code & bullet points!
3. DO NOT use rigid robotic headings like "Executive Concept Overview" or "Step 1 (Core Fundamentals)".
4. Give a direct, easy-to-understand, engaging explanation with real-world analogies, code examples with comments, and key tips.
5. Keep formatting clean using bold headings, code blocks (\`\`\`html, \`\`\`js, etc.), and bullet points.`;
  const sysMsg = systemInstruction || defaultSystemMsg;

  // 1. Try Groq API (Llama / Compound / GPT OSS models)
  if (GROQ_API_KEY) {
    for (const modelName of GROQ_MODELS) {
      try {
        const url = "https://api.groq.com/openai/v1/chat/completions";
        const requestBody = {
          model: modelName,
          messages: [
            { role: "system", content: sysMsg },
            { role: "user", content: cleanPrompt }
          ],
          temperature: 0.6,
          max_tokens: 1500
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
            console.log(`Successfully generated AI response using Groq model: ${modelName}`);
            return text.trim();
          }
        } else {
          const errText = await response.text();
          console.warn(`Groq model ${modelName} returned status ${response.status}:`, errText.slice(0, 150));
        }
      } catch (err) {
        console.warn(`Groq model ${modelName} exception:`, err.message);
      }
    }
  }

  // 2. Try candidate Gemini models as secondary backup
  const fullPrompt = systemInstruction
    ? `[System Instruction: ${systemInstruction}]\n\nStudent Question / Code Doubt: ${cleanPrompt}\n\nPROVIDE A DETAILED, HIGHLY ACCURATE, PROFESSIONAL & CLEAR STEP-BY-STEP EXPLANATION.`
    : cleanPrompt;

  for (const modelName of GEMINI_API_KEY ? GEMINI_MODELS : []) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      const requestBody = {
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 2500 }
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
          console.log(`Successfully generated AI response using Gemini model: ${modelName}`);
          return text.trim();
        }
      }
    } catch (err) {
      console.warn(`Gemini model ${modelName} exception:`, err.message);
    }
  }

  // 3. Fallback: Smart Academic Answer Generator if external APIs are unreachable
  return generateSmartAcademicFallback(cleanPrompt);
}

export function generateSmartAcademicFallback(query) {
  const text = (query || "").toLowerCase().trim();
  const rawTopic = query.replace(/(sir|bhai|mujhe|tell me|explain|what is|how to|about|ke bare me|batao|bataye|\?)/gi, '').trim() || 'Programming & Academic Doubt';

  if (text.includes("html")) {
    return `🌐 **HTML Code & Explanation by Phlappy AI**

HTML (HyperText Markup Language) web pages ka basic structure banane ke liye use hota hai.

### 📝 Basic HTML Code Example:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Phlappy AI Web Page</title>
</head>
<body>
    <h1>Welcome to TCM One Phlappy AI 🚀</h1>
    <p>Yeh simple HTML structure hai.</p>
    <button onclick="alert('Hello from Phlappy AI!')">Click Me</button>
</body>
</html>
\`\`\`

### 🎯 Key HTML Tags:
- \`<html>\`: Root element of HTML document.
- \`<head>\`: Page title aur metadata hold karta hai.
- \`<body>\`: Visible content (headings, paragraphs, buttons) show karta hai.
- \`<h1>\` to \`<h6>\`: Headings ke liye.
- \`<p>\`: Paragraph text ke liye.

🚀 **Tip**: Save file as \`index.html\` aur Chrome/Edge browser me double-click karke run karo!`;
  }

  if (text.includes("python")) {
    return `🐍 **Python Code & Explanation by Phlappy AI**

Python ek simple, powerful aur high-level programming language hai!

### 📝 Python Code Example:
\`\`\`python
# Simple Python Program
def greet(name):
    return f"Hello {name}, welcome to Phlappy AI Learning!"

print(greet("Student"))
\`\`\`

🎯 **Tip**: Variables aur functions se start karo, phr loops & data structures seekho!`;
  }

  if (text.includes("django")) {
    return `🎓 **Django Overview by Phlappy AI**

Django ek Python web framework hai jo MVT (Model, View, Template) architecture follow karta hai.

\`\`\`python
from django.http import JsonResponse

def home_view(request):
    return JsonResponse({"message": "Hello from Phlappy AI and Django!"})
\`\`\``;
  }

  if (text.includes("react") || text.includes("javascript") || text.includes("js")) {
    return `⚡ **React & JS Guide by Phlappy AI**

React component-based UI build karne me help karta hai.

\`\`\`javascript
import React, { useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}
\`\`\``;
  }

  return `🤖 **Phlappy AI Explanation on "${rawTopic}"**

Aapke doubt **"${query}"** ka quick explanation:

1. **Core Concept**: Topic ko smaller components me divide karo.
2. **Implementation**: Logic ko clean structured code me write karo.
3. **Best Practice**: Testing aur comments add karo.

Agar specific code sample chahiye to specify karke puch sakte ho! 🚀`;
}
