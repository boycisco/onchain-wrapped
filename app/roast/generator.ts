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
 * Validate raw model output.
 *
 *  - split on newlines, trim, drop empties
 *  - run the anti-fabrication check on the RAW lines, before any stripping
 *  - strip only genuine list markers (`1. `, `2) `, `- `, `* `, bullets)
 *  - cap to MAX_LINES
 *  - require between MIN_LINES and MAX_LINES
 *
 * Order matters: if we stripped before checking, a fabricated number at the
 * start of a line (e.g. "87% of your transactions...") would be erased and
 * the fabrication check would pass silently.
 */
export function validateRoastOutput(
  raw: string,
  promptFacts: string,
): string[] | null {
  if (!raw) return null;

  const rawLines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (rawLines.length < MIN_LINES) return null;

  const cappedRaw = rawLines.slice(0, MAX_LINES);

  // Anti-fabrication runs on the raw lines, BEFORE stripping markers.
  const numericTokens = cappedRaw.join(' ').match(/\d{3,}/g) ?? [];
  for (const tok of numericTokens) {
    if (!promptFacts.includes(tok)) return null;
  }

  // Strip only real list markers: optional leading space, then a bullet
  // char OR digits followed by `.`/`)`, then whitespace.
  // This does NOT strip a leading standalone number like "87% ..." because
  // that number is content, not a marker.
  const marker = /^\s*(?:[-*\u2022]|\d+[.)])(?:\s+|$)/;
  const stripped = cappedRaw
    .map((s) => s.replace(marker, '').trim())
    .filter((s) => s.length > 0);

  if (stripped.length < MIN_LINES) return null;
  return stripped;
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