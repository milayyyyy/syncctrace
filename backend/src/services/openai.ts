import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

const SYSTEM_PROMPT = `You are an expert software engineering reviewer specializing in traceability analysis for capstone projects. Analyze whether the downstream document properly addresses all requirements and specifications defined in the upstream document.

Respond with a JSON object matching this exact structure:
{
  "alignmentScore": <integer 0-100>,
  "status": <"PASS" | "WARN" | "FAIL">,
  "evidencePairs": [
    { "upstream": "<key requirement or section excerpt>", "downstream": "<matching section excerpt>", "similarity": <float 0-1> }
  ],
  "gaps": [
    {
      "description": "<clear description of what is missing or inconsistent>",
      "severity": <"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">,
      "rootCause": "<why this gap exists>",
      "recommendation": "<specific, actionable fix>",
      "aiConfidence": <float 0-1>
    }
  ],
  "summary": "<2-3 sentence overall assessment>"
}

Scoring guidance:
- PASS: alignmentScore >= 80 (all key requirements are traceable and covered)
- WARN: alignmentScore 60-79 (most requirements covered, notable gaps exist)
- FAIL: alignmentScore < 60 (significant traceability gaps, project not ready)

Include up to 5 evidence pairs showing the strongest links found.
Report all gaps discovered; prioritize by severity.`;

export async function analyzeTraceability(
  upstream: { id: string; type: string; content: string },
  downstream: { id: string; type: string; content: string },
): Promise<TraceabilityAnalysis> {
  // Truncate to avoid token limits (gpt-4o-mini context is 128k tokens)
  const upContent = upstream.content.slice(0, 6000);
  const downContent = downstream.content.slice(0, 6000);

  const userContent = `Analyze traceability from ${upstream.type} to ${downstream.type}.

=== UPSTREAM DOCUMENT (${upstream.type}) ===
${upContent}

=== DOWNSTREAM DOCUMENT (${downstream.type}) ===
${downContent}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  });

  const raw = completion.choices[0].message.content ?? '{}';
  return JSON.parse(raw) as TraceabilityAnalysis;
}
