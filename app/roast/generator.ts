import { loadConfig } from '@/app/core/config';
import { buildPrompt } from './prompts';
import { pickFallback } from './templates';
import type { Roast, RoastInput } from './types';

const MODEL = 'gemini-2.5-flash';
const MAX_LINES = 5;
const MIN_LINES = 1;

export type GenerateOptions = {
  /** Override the LLM call in tests. */
  callModel?: (prompt: string) => Promise<string>;
  /** Force the fallback path. */
  forceFallback?: boolean;
};

/**
 * Validate raw model output:
 *  - split on newlines, trim, drop empties
 *  - cap to MAX_LINES
 *  - require between MIN_LINES and MAX_LINES
 *  - reject if any numeric token (3+ digits) is not present in the prompt facts
 * Returns lines or null if invalid.
 */
export function validateRoastOutput(
  raw: string,
  promptFacts: string,
): string[] | null {
  if (!raw) return null;
  // Strip leading bullets ("-", "*", "\u2022") and numbering ("1.", "1)").
  const strip = /^[\s\-\*\u2022\d.)]+/;
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.replace(strip, '').trim())
    .filter((s) => s.length > 0);

  if (lines.length < MIN_LINES) return null;
  const capped = lines.slice(0, MAX_LINES);

  // Anti-fabrication: any 3+ digit number must appear in the prompt.
  const numericTokens = capped.join(' ').match(/\d{3,}/g) ?? [];
  for (const tok of numericTokens) {
    if (!promptFacts.includes(tok)) return null;
  }

  return capped;
}

async function defaultCallModel(prompt: string): Promise<string> {
  const config = loadConfig();
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  // Lazy import so tests don't pull in the SDK.
  const { GoogleGenAI } = (await import('@google/genai')) as typeof import('@google/genai');
  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  // The SDK exposes `.text` on the response in @google/genai v2+.
  const text = (response as { text?: string }).text ?? '';
  return text;
}

/**
 * Generate a roast. Never throws. Never returns empty lines.
 * If the AI path fails for any reason, returns a deterministic fallback.
 */
export async function generateRoast(
  input: RoastInput,
  options: GenerateOptions = {},
): Promise<Roast> {
  const fallback = (reason: string): Roast => ({
    lines: pickFallback(input),
    source: 'fallback',
    fallbackReason: reason,
  });

  if (options.forceFallback) {
    return fallback('forced');
  }

  const prompt = buildPrompt(input);
  const callModel = options.callModel ?? defaultCallModel;

  try {
    const raw = await callModel(prompt);
    const lines = validateRoastOutput(raw, prompt);
    if (!lines) {
      return fallback('invalid_model_output');
    }
    return { lines, source: 'gemini' };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown_error';
    return fallback(reason);
  }
}