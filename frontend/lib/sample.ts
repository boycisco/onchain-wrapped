import { WrappedData, CompareResponse } from './types';

/**
 * Authentic sample datasets matching the exact backend V1 schema.
 * Isolated strictly for local frontend development and previews.
 * The backend agent can seamlessly disconnect or remove this file.
 */

export const SAMPLE_NIGHT_OWL: WrappedData = {
  wallet: '0x71C856429f45B453472E8A9874836f6E780E98A2',
  range: 'year',
  generatedAt: '2026-10-07T08:00:00Z',
  identity: {
    name: 'THE NIGHT OWL DEGEN',
    score: 87,
    traits: [
      'high night activity',
      'high activity, bursty pattern',
      'heavy DEX rotater'
    ],
    rarity: null, // null in V1: frontend must never fabricate percentiles
  },
  activity: {
    transactions: 1842,
    activeDays: 127,
    busiestDay: '2026-08-14',
  },
  timing: {
    busiestHour: 2,
    busiestDayOfWeek: 'Friday',
    nightFraction: 0.64,
    lateNightFraction: 0.42,
  },
  money: {
    nativeSent: '14.852',
    nativeReceived: '18.210',
    topToken: 'USDC',
    usdValuation: 'unavailable', // unavailable in V1: never show fake $
  },
  addresses: {
    uniqueAddresses: 83,
    top: [
      { address: '0x4200000000000000000000000000000000000006', count: 312, label: 'WETH Gateway' },
      { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', count: 240, label: 'USDC Token' },
      { address: '0x2626664c2603336E57B271c5C0b26F421741e481', count: 188, label: 'Aerodrome Router' },
      { address: '0x49048044D57e1C92A77f79988d21Fa8fAF74E97e', count: 94, label: 'Uniswap V3' },
    ],
  },
  roast: {
    lines: [
      'You traded at 3 AM on a Tuesday like the blockchain was about to close down forever.',
      'Your gas spend proves you hate money almost as much as you hate healthy sleep cycles.'
    ],
    source: 'gemini',
  },
  cards: ['activity', 'identity', 'timing', 'money', 'addresses', 'roast'],
};

export const SAMPLE_BUILDER: WrappedData = {
  wallet: '0x98D3F12061Ac50B1B3Ac071c3f2F0A38d8B983F1',
  range: 'year',
  generatedAt: '2026-10-07T08:00:00Z',
  identity: {
    name: 'THE QUIET BUILDER',
    score: 64,
    traits: [
      'disciplined daylight rhythm',
      'high-value batch settlements',
      'low churn holding pattern'
    ],
    rarity: null,
  },
  activity: {
    transactions: 421,
    activeDays: 89,
    busiestDay: '2026-05-22',
  },
  timing: {
    busiestHour: 11,
    busiestDayOfWeek: 'Wednesday',
    nightFraction: 0.18,
    lateNightFraction: 0.05,
  },
  money: {
    nativeSent: '31.200',
    nativeReceived: '29.850',
    topToken: 'cbETH',
    usdValuation: 'unavailable',
  },
  addresses: {
    uniqueAddresses: 95,
    top: [
      { address: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', count: 120, label: 'Uniswap V3 Pool' },
      { address: '0x4200000000000000000000000000000000000006', count: 88, label: 'WETH' },
    ],
  },
  roast: {
    lines: [
      'You move capital with all the spontaneity of a government bond auction.',
      'Even your meme coins are deployed using multi-sig committee signatures.'
    ],
    source: 'fallback',
  },
  cards: ['activity', 'identity', 'timing', 'money', 'addresses', 'roast'],
};

export const SAMPLE_MINIMAL: WrappedData = {
  wallet: '0x3F5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
  range: 'last30',
  generatedAt: '2026-10-07T08:00:00Z',
  identity: {
    name: 'THE DORMANT OBSERVER',
    score: 22,
    traits: [
      'sporadic visits',
      'minimal interaction footprint'
    ],
    rarity: null,
  },
  activity: {
    transactions: 6,
    activeDays: 3,
    busiestDay: '2026-09-18',
  },
  timing: {
    busiestHour: 15,
    busiestDayOfWeek: 'Sunday',
    nightFraction: 0.10,
    lateNightFraction: 0.00,
  },
  money: {
    nativeSent: '0.045',
    nativeReceived: '0.050',
    topToken: null,
    usdValuation: 'unavailable',
  },
  // Note: addresses card omitted when uniqueAddresses === 0
  roast: {
    lines: [
      'Your wallet has touched Base so infrequently we almost asked if you needed directions.',
    ],
    source: 'fallback',
  },
  cards: ['activity', 'identity', 'timing', 'money', 'roast'], // addresses explicitly omitted!
};

export const SAMPLE_COMPARE: CompareResponse = {
  a: {
    wallet: '0x71C856429f45B453472E8A9874836f6E780E98A2',
    identity: {
      name: 'THE NIGHT OWL DEGEN',
      score: 87,
    },
  },
  b: {
    wallet: '0x98D3F12061Ac50B1B3Ac071c3f2F0A38d8B983F1',
    identity: {
      name: 'THE QUIET BUILDER',
      score: 64,
    },
  },
  comparison: {
    overall: {
      winner: 'a',
      aWins: 4,
      bWins: 2,
      ties: 0,
      headline: 'You took 4 out of 6 categories.',
    },
    categories: [
      {
        key: 'transactions',
        name: 'Transactions',
        aValue: '1,842',
        bValue: '421',
        winner: 'a',
        difference: '+1,421',
        ratio: '4.38x',
        summary: 'You made 4.4x more transactions than them.',
      },
      {
        key: 'activeDays',
        name: 'Active Days',
        aValue: '127',
        bValue: '89',
        winner: 'a',
        difference: '+38',
        ratio: '1.43x',
        summary: 'You showed up on 38 more days.',
      },
      {
        key: 'uniqueAddresses',
        name: 'Unique Addresses',
        aValue: '83',
        bValue: '95',
        winner: 'b',
        difference: '+12',
        ratio: '1.14x',
        summary: 'They explored 12 more contracts and addresses.',
      },
      {
        key: 'activeStreak',
        name: 'Active Streak',
        aValue: '18 days',
        bValue: '7 days',
        winner: 'a',
        difference: '+11 days',
        ratio: '2.57x',
        summary: 'Your longest consecutive active streak was more than double.',
      },
      {
        key: 'nightActivity',
        name: 'Night Activity',
        aValue: '64%',
        bValue: '18%',
        winner: 'a',
        difference: '+46%',
        ratio: '3.56x',
        summary: 'You do almost all your volume under moonlight.',
      },
      {
        key: 'nativeSent',
        name: 'Native Sent',
        aValue: '14.85 ETH',
        bValue: '31.20 ETH',
        winner: 'b',
        difference: '+16.35 ETH',
        ratio: '2.10x',
        summary: 'They moved more native ETH.',
      },
    ],
  },
  timings: {
    totalMs: 1850,
  },
  cached: false,
};
