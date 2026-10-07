// scripts/gemini.mjs
// One-off verification that the Gemini SDK call shape matches what
// app/roast/generator.ts expects.
//
// Run:  node scripts/gemini.mjs
// Requires GEMINI_API_KEY in .env.local.

import { readFileSync } from 'node:fs';
import path from 'node:path';

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), '.env.local');
  try {
    const txt = readFileSync(p, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const [, k, v] = m;
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '');
    }
  } catch {
    // no .env.local
  }
}
loadEnvLocal();

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('Missing GEMINI_API_KEY. Put it in .env.local and re-run.');
  process.exit(1);
}

const MODEL = 'gemini-2.5-flash';

console.log(`\nModel: ${MODEL}`);
console.log('API key: present (not printed)\n');

const { GoogleGenAI } = await import('@google/genai');

const client = new GoogleGenAI({ apiKey: key });

console.log('--- SDK method presence check ---');
console.log('  client.models                  ', typeof client.models);
console.log('  client.models.generateContent  ', typeof client.models.generateContent);

const prompt = [
  'Write exactly 3 short lines that would roast a wallet.',
  'Each line one sentence.',
  'Base every joke on this fact: the wallet made 42 transactions this year.',
  'Do not include any numbers other than 42.',
  'Output only the lines, one per line.',
].join('\n');

console.log('\n--- Calling generateContent ---');

let response;
try {
  response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
} catch (err) {
  console.error('\nCall failed. Error shape:');
  console.error(JSON.stringify(
    { name: err?.name, message: err?.message, status: err?.status },
    null,
    2,
  ));
  console.error('\nFull error (truncated to first 800 chars):');
  console.error(String(err).slice(0, 800));
  process.exit(1);
}

console.log('\n--- Response top-level keys ---');
console.log('  ' + Object.keys(response).join(', '));

console.log('\n--- typeof response.text ---');
console.log('  ' + typeof response.text);

let textValue = '';
try {
  textValue = response.text ?? '';
} catch (err) {
  console.log('  (threw when read as property)');
}

if (!textValue) {
  console.log('\n.response.text is empty; dumping response.candidates[0] if present:');
  const cand = response?.candidates?.[0];
  if (cand) {
    console.log('  keys:', Object.keys(cand).join(', '));
    const parts = cand?.content?.parts;
    if (Array.isArray(parts)) {
      textValue = parts.map((p) => p?.text ?? '').join('');
    }
  }
}

console.log('\n--- Extracted text ---');
console.log(textValue || '(empty)');

console.log('\nDone.\n');