import OpenAI from 'openai';

// OpenRouter is OpenAI-API compatible — just swap the base URL and key
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: 120000, // 2 minute timeout for large documents
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:4000', // Optional but recommended
    'X-Title': 'SyncTrace',
  }
});

export interface EvidencePair {
  upstream: string;
  downstream: string;
  similarity: number;
}

export interface GapResult {
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rootCause: string;
  recommendation: string;
  aiConfidence: number;
}

export interface TraceabilityAnalysis {
  alignmentScore: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  evidencePairs: EvidencePair[];
  gaps: GapResult[];
  summary: string;
}

const SYSTEM_PROMPT = `You are an expert software engineering reviewer. Analyze traceability between documents for capstone projects.
Analyze whether the downstream document addresses the upstream requirements.

RESPONSE RULES:
- Return ONLY valid JSON.
- Be concise in 'summary' and 'description'.
- Do not preamble or explain your reasoning outside the JSON.
- High accuracy: ensure evidencePairs contain real excerpts from the text.
- Include up to 5 evidence pairs showing the strongest links found.
- Report all gaps discovered; prioritize by severity.

JSON structure:
{
  "alignmentScore": <float 0-100, be extremely precise e.g. 91.4>,
  "coverageScore": <float 0-100, percentage of requirements mapped>,
  "status": "PASS" | "WARN" | "FAIL",
  "evidencePairs": [{ "upstream": "excerpt", "downstream": "excerpt", "similarity": 0-1 }],
  "gaps": [{ "description": "...", "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW", "rootCause": "...", "recommendation": "...", "aiConfidence": 0-1 }],
  "summary": "..."
}
NOTE: alignmentScore (semantic quality) and coverageScore (quantity) must be different.`;

export async function analyzeTraceability(
  upstream: { id: string; type: string; content: string },
  downstream: { id: string; type: string; content: string },
): Promise<TraceabilityAnalysis & { coverageScore?: number }> {
  // Gemini free tier: 1,000,000 TPM — send the full document content with no truncation.
  const upContent   = upstream.content;
  const downContent = downstream.content;

  const userContent = `Analyze traceability from ${upstream.type} to ${downstream.type}.

=== UPSTREAM DOCUMENT (${upstream.type}) ===
${upContent}

=== DOWNSTREAM DOCUMENT (${downstream.type}) ===
${downContent}`;

  const completion = await openai.chat.completions.create({
    // Using DeepSeek V4 Flash (free) which is a newer and more efficient model
    model: 'deepseek/deepseek-v4-flash:free',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const data = JSON.parse(raw);
  if (!data.coverageScore) data.coverageScore = data.alignmentScore;
  return data;
}
