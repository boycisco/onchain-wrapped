import type { RoastInput } from './types';

/**
 * Deterministic fallback roasts.
 * Keyed by identity core (the last word of the name, lowercased).
 * If nothing matches, FALLBACK_DEFAULT is used.
 *
 * Templates MUST be safe, funny, and never reference specific numbers
 * we cannot verify. They may reference the identity name verbatim.
 */
const TEMPLATES: Record<string, string[]> = {
  degen: [
    'You treat Base like a 24/7 casino and the house knows your name.',
    'Your wallet has seen more action than most mainnets.',
    'Sleep is a rumor you have heard about but never confirmed.',
    'You would bridge to a chain just to see what happens.',
    'Somewhere a gas fee just paid for your lifestyle.',
  ],
  grinder: [
    'You show up onchain like it is a job.',
    'Consistency is your love language and Base is your office.',
    'You have turned blockchain activity into a daily habit.',
    'Some people collect coins. You collect sessions.',
    'Your routine has a routine.',
  ],
  explorer: [
    'You treat every address as a potential new best friend.',
    'Your wallet has more contacts than most phones.',
    'You never met a contract you did not want to try.',
    'Somewhere there is an unvisited contract you are already planning to see.',
    'Curiosity looks good on you.',
  ],
  hodler: [
    'You move so rarely that your wallet has become furniture.',
    'Your favorite transaction is the one you did not make.',
    'You are the reason some contracts think they are abandoned.',
    'Patience is a strategy. Yours is legendary.',
    'You let the chain come to you.',
  ],
  loyalist: [
    'You have your favorites and you are not shy about it.',
    'New contracts? You will get to them eventually. Maybe.',
    'Your go-to addresses know you by name.',
    'You are a regular, and that is rare.',
    'Loyalty is underrated and you are proof.',
  ],
  ghost: [
    'You have been onchain, technically.',
    'Your wallet exists and that is basically the whole story.',
    'Even the block explorer had to double-check.',
    'Somewhere a smart contract is still waiting for your second visit.',
    'Small footprint. Big mystery.',
  ],
  tourist: [
    'You drop by occasionally to remind the chain you exist.',
    'Base is a nice place to visit and you are doing exactly that.',
    'You are the onchain equivalent of a weekend getaway.',
    'Short trips, small bags, no regrets.',
    'You leave before the gas fees get awkward.',
  ],
  mystery: [
    'Your onchain story is still being written.',
    'You defy easy categorization, which is a compliment.',
    'The chain has no idea what to make of you yet.',
    'Some wallets are open books. You are a locked journal.',
    'You are the plot twist.',
  ],
};

export const FALLBACK_DEFAULT: string[] = [
  'Your wallet has a story and it is not telling us everything.',
  'The numbers are in. The vibes are undecided.',
  'Onchain Wrapped does not know what to make of you.',
  'Whatever you are doing, keep doing it.',
  'You are a category of one.',
];

/**
 * Pick a fallback roast for the given input.
 * Deterministic: same identity -> same lines (until the templates change).
 */
export function pickFallback(input: RoastInput): string[] {
  const core = extractCore(input.identity.name);
  const lines = TEMPLATES[core] ?? FALLBACK_DEFAULT;
  return lines.slice(0, 5);
}

/** "THE NIGHT OWL DEGEN" -> "degen" */
function extractCore(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? '';
  return last.toLowerCase();
}