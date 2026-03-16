/**
 * geminiSummarizer.ts
 * --------------------
 * Calls Google Gemini Flash (free tier) for case-study summarization.
 *
 * Why Gemini Flash instead of Llama 3 8B on HuggingFace?
 *   - 1M token context window -> full 12-page Ivey cases fit with room to spare.
 *   - No truncation -> model sees exhibits, endnotes, competitor tables.
 *   - Free tier: 15 RPM / 1M TPM / 1,500 RPD (as of early 2025).
 *
 * Setup:
 *   1. Get a free API key at https://aistudio.google.com/apikey
 *   2. Add VITE_GEMINI_API_KEY=<your-key> to your .env file
 *
 * This module is a drop-in replacement - it takes systemPrompt + caseText
 * and returns the summary string. The hook (usePreReadPdfs) calls it.
 */

const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || "";

// Using gemini-2.0-flash - free tier, 1M context, strong instruction following
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiCandidate {
  content?: {
    parts?: { text?: string }[];
  };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string; code?: number };
}

export async function callGeminiFlash(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file. " +
      "Get a free key at https://aistudio.google.com/apikey"
    );
  }

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      topP: 0.95,
      topK: 40,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message || "Unknown error"}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}
