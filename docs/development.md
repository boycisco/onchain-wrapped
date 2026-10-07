# Development

## Prerequisites

- Node.js 22 LTS or newer
- npm 10+
- Git
- (optional) Docker for container builds

## Setup

    git clone <your-fork>
    cd onchain-wrapped
    npm install
    cp .env.example .env.local

Then edit `.env.local`:

    BASE_RPC_URL=https://mainnet.base.org
    ALCHEMY_API_KEY=your_alchemy_key
    GEMINI_API_KEY=your_gemini_key   # optional

- `BASE_RPC_URL`: any Base mainnet JSON-RPC endpoint. The public one is fine
  for local dev; use a dedicated provider for production.
- `ALCHEMY_API_KEY`: free at https://dashboard.alchemy.com. Create an app
  for Base / Base Mainnet. The Transfers API is what we use.
- `GEMINI_API_KEY`: free at https://aistudio.google.com/apikey. If absent,
  the roast layer falls back to deterministic templates. The app still works.

## Running

    npm run dev       # Next.js dev server on :3000
    npm run build     # production build
    npm run start     # serve the production build
    npm test          # Vitest run, single pass
    npm run test:watch
    npm run test:coverage
    npm run lint

## Verifying against real providers

    node scripts/verify.mjs

This hits the real Alchemy endpoint with a well-known wallet and prints the
shape of the response. Use it after changing `normalize.ts` or when
upgrading the Alchemy integration.

For Gemini, the test suite exercises the generator with a mocked model call.
To check the real Gemini path locally:

1. Ensure `GEMINI_API_KEY` is set in `.env.local`.
2. Ensure `FORCE_ROAST_FALLBACK` is **not** set.
3. Run `npm run dev`.
4. `POST /api/wrapped` with any address.
5. Inspect `wrapped.roast.source`. It should be `"gemini"`.

## Repository conventions

- File and folder names are one word wherever practical: `analysis/`,
  `identity/`, `contracts.ts`, not `wallet_analysis/`.
- TypeScript strict mode is on. No `any` without a comment.
- Every module in `app/analysis/` is a pure function. No I/O, no clock.
- Every module in `app/data/` may do I/O, but only `app/data/alchemy.ts`
  and `app/data/rpc.ts` are allowed to know about specific providers.
- Tests live under `tests/` mirroring `app/`. Fixtures under `tests/fixtures/`.

## Adding a new metric

1. Decide which analysis module owns it (activity / money / contracts / timing).
2. Add the field to that module's `*Stats` type.
3. Compute it in the module's `analyze*()` function.
4. Add a test in `tests/<module>.test.ts`.
5. If it should appear on a card, extend `app/cards/types.ts` and
   `app/cards/build.ts`.
6. If it should affect identity, add or adjust a rule in
   `app/identity/rules.ts`.

## Adding a new personality rule

1. Add an entry to `RULES` in `app/identity/rules.ts`. Choose a `role`
   (`"core"` or `"prefix"`), a stable `id`, a human `name`, a lowercase
   `trait` phrase, a `weight` (higher wins), and a `matches` predicate.
2. Add a test in `tests/identity/score.test.ts`.
3. If the new rule should be suppressed for low-activity wallets, add its
   id to `SUPPRESS_PREFIX_IF_CORE_IN`.

## Adding another indexer

See `docs/data.md` -> "Adding another indexer". The change is contained to
`app/data/`.

## Deployment notes

The application is a standard Next.js app. It runs as a single Node process
with an in-memory cache. For horizontal scaling, swap `InMemoryCache` for a
shared implementation (Redis) in `app/core/cache.ts`.

No database is required for V1. Reports are generated on demand.

## Environment variables reference

| Name | Required | Notes |
|---|---|---|
| `BASE_RPC_URL` | yes | Base mainnet JSON-RPC URL |
| `ALCHEMY_API_KEY` | yes for real data | If missing, `/api/wrapped` will throw `CONFIG_ERROR` |
| `GEMINI_API_KEY` | no | If missing, roast falls back to templates |
| `FORCE_ROAST_FALLBACK` | no | Set to `"1"` to always use deterministic roasts |