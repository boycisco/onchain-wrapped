// scripts/verify.mjs
// One-off manual verification against the real Alchemy Base mainnet endpoint.
// Run:  node scripts/verify.mjs
// Requires ALCHEMY_API_KEY in .env.local (loaded below).

import { readFileSync } from 'node:fs';
import path from 'node:path';

// --- tiny .env.local loader (no dependency) ---
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
    // no .env.local - fine, user may have exported vars in shell
  }
}
loadEnvLocal();

const key = process.env.ALCHEMY_API_KEY;
if (!key) {
  console.error('Missing ALCHEMY_API_KEY. Put it in .env.local and re-run.');
  process.exit(1);
}

// A known busy Base wallet. Vitalik is a good mix: sends, receives, contracts.
const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

const CATEGORIES = ['external', 'internal', 'erc20', 'erc721', 'erc1155', 'specialnft'];
const url = `https://base-mainnet.g.alchemy.com/v2/${key}`;

async function call(params) {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [params],
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    console.error('HTTP', res.status, JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return json.result;
}

console.log(`\nWallet: ${WALLET}`);
console.log(`Endpoint: https://base-mainnet.g.alchemy.com/v2/***\n`);

// --- outgoing ---
const out = await call({
  fromBlock: '0x0',
  toBlock: 'latest',
  fromAddress: WALLET,
  category: CATEGORIES,
  withMetadata: true,
  excludeZeroValue: false,
  maxCount: '0x5',
  order: 'desc',
});

console.log(`Outgoing transfers returned: ${out.transfers?.length ?? 0}`);
console.log(`pageKey present: ${out.pageKey ? 'yes' : 'no'}\n`);

if (out.transfers && out.transfers.length > 0) {
  console.log('--- First outgoing transfer (raw shape) ---');
  console.log(JSON.stringify(out.transfers[0], null, 2));

  console.log('\n--- Field presence check ---');
  const t = out.transfers[0];
  const fields = [
    'blockNum', 'hash', 'from', 'to', 'value', 'asset', 'category',
    'rawContract', 'metadata', 'uniqueId', 'erc721TokenId',
    'erc1155Metadata', 'tokenId',
  ];
  for (const f of fields) {
    console.log(`  ${f.padEnd(18)} ${f in t ? 'present' : 'MISSING'}`);
  }
  if (t.rawContract) {
    console.log('\n  rawContract.value   ', t.rawContract.value);
    console.log('  rawContract.address ', t.rawContract.address);
    console.log('  rawContract.decimal ', t.rawContract.decimal);
  }
  if (t.metadata) {
    console.log('  metadata.blockTimestamp ', t.metadata.blockTimestamp);
  }
}

// --- incoming ---
const inc = await call({
  fromBlock: '0x0',
  toBlock: 'latest',
  toAddress: WALLET,
  category: CATEGORIES,
  withMetadata: true,
  excludeZeroValue: false,
  maxCount: '0x5',
  order: 'desc',
});

console.log(`\nIncoming transfers returned: ${inc.transfers?.length ?? 0}`);
console.log(`pageKey present: ${inc.pageKey ? 'yes' : 'no'}`);

console.log('\n--- Categories seen in the sample ---');
const seen = new Set([...(out.transfers ?? []), ...(inc.transfers ?? [])].map((t) => t.category));
console.log('  ' + [...seen].join(', ') || '  (none)');

console.log('\nDone.\n');