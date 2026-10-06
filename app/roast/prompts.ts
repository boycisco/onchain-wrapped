import type { RoastInput } from './types';

/**
 * Build a deterministic prompt from verified stats only.
 * This function is the ONLY thing that ever reaches the LLM.
 * Never interpolate raw provider responses here.
 */
export function buildPrompt(input: RoastInput): string {
  const { activity, contracts, timing, behavior, identity, walletShort } = input;

  const topContracts = contracts.topAddresses
    .slice(0, 3)
    .map((c, i) => `  ${i + 1}. ${shorten(c.address)} (${c.interactions} txs)`)
    .join('\n') || '  (none)';

  const facts = [
    `Wallet (shortened): ${walletShort}`,
    `Total transactions: ${activity.totalTransactions}`,
    `Successful: ${activity.successfulTransactions}`,
    `Failed: ${activity.failedTransactions}`,
    `Unknown status: ${activity.unknownTransactions}`,
    `Active days: ${activity.activeDays}`,
    `Longest active streak (days): ${activity.longestActiveStreak}`,
    `Longest inactive gap (days): ${activity.longestInactiveStreak}`,
    `Busiest day: ${activity.busiestDay ? activity.busiestDay.date + ' with ' + activity.busiestDay.count + ' txs' : 'none'}`,
    `Unique addresses interacted with: ${contracts.uniqueAddresses}`,
    `Top addresses:\n${topContracts}`,
    `Day activity fraction: ${timing.day.fraction}`,
    `Night activity fraction: ${timing.night.fraction}`,
    `Late-night activity fraction (23:00-04:59 UTC): ${timing.lateNight.fraction}`,
    `Weekend fraction: ${timing.weekend.fraction}`,
    `Behavior scores (0..1): activity=${behavior.activity} exploration=${behavior.exploration} consistency=${behavior.consistency} loyalty=${behavior.loyalty} timing=${behavior.timing}`,
    `Identity: ${identity.name} (score ${identity.score}/100)`,
    `Identity traits: ${identity.traits.join(', ') || 'none'}`,
  ].join('\n');

  return `You write short, sharp, funny roasts for a wallet-analytics product called Onchain Wrapped.
The user has asked for a roast of their Base wallet.

STRICT RULES:
- Maximum 5 lines.
- Each line is one sentence. No bullet points, no numbering, no markdown.
- Base every joke on the FACTS below. Do NOT invent transactions, amounts, tokens, dollar values, or dates that are not in the facts.
- Do NOT claim illegal activity, do not target protected classes, do not produce hateful content.
- Do NOT include specific numbers unless they appear in the FACTS.
- Do NOT mention that you are an AI or a model.
- If there is very little activity, be gentle and self-aware, not cruel.

FACTS (all values verified):
${facts}

Now write the roast. Output ONLY the lines, one per line.`;
}

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}