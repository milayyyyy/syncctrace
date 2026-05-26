import OpenAI from 'openai';

let openai: OpenAI | null = null;

function openRouterModels(): string[] {
  const configured = process.env.OPENROUTER_MODELS ?? process.env.OPENROUTER_MODEL;
  if (configured) {
    return configured
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
  }

  return ['deepseek/deepseek-v4-flash:free'];
}

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY. Configure it before running audits.');
  }

  openai ??= new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 120000, // 2 minute timeout for large documents
    defaultHeaders: {
      'HTTP-Referer': process.env.FRONTEND_URL ?? 'http://localhost:4000',
      'X-Title': 'SyncTrace',
    },
  });

  return openai;
}

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

type RetryableAiError = Error & { status?: number };

function retryableAiError(message: string): RetryableAiError {
  const err = new Error(message) as RetryableAiError;
  err.status = 502;
  return err;
}

function shouldTryNextModel(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 502 || status === 503;
}

function parseAnalysis(raw: string, model: string): TraceabilityAnalysis & { coverageScore?: number } {
  let data: Partial<TraceabilityAnalysis & { coverageScore?: number }>;
  try {
    data = JSON.parse(raw) as Partial<TraceabilityAnalysis & { coverageScore?: number }>;
  } catch {
    throw retryableAiError(`Model ${model} returned invalid JSON.`);
  }

  const alignmentScore = typeof data.alignmentScore === 'number' ? data.alignmentScore : Number(data.alignmentScore);
  if (!Number.isFinite(alignmentScore)) {
    throw retryableAiError(`Model ${model} returned an invalid alignment score.`);
  }

  return {
    alignmentScore,
    coverageScore: typeof data.coverageScore === 'number' ? data.coverageScore : alignmentScore,
    status: data.status === 'PASS' || data.status === 'WARN' || data.status === 'FAIL' ? data.status : 'FAIL',
    evidencePairs: Array.isArray(data.evidencePairs) ? data.evidencePairs : [],
    gaps: Array.isArray(data.gaps) ? data.gaps : [],
    summary: typeof data.summary === 'string' ? data.summary : 'Traceability analysis completed.',
  };
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

  const models = openRouterModels();
  let lastError: unknown;

  for (const model of models) {
    try {
      const completion = await getOpenAI().chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      });
      const raw = completion.choices?.[0]?.message?.content;
      if (!raw) {
        throw retryableAiError(`Model ${model} returned no analysis content.`);
      }
      return parseAnalysis(raw, model);
    } catch (err) {
      lastError = err;
      if (!shouldTryNextModel(err)) throw err;
    }
  }

  if (lastError) throw lastError;
  throw new Error('No OpenRouter models are configured.');
}
