# Architecture

## The pipeline

Every wallet request flows through exactly this path. Nothing skips a stage.

    wallet
      |
      v
    fetch         (app/data)       provider -> normalized models
      |
      v
    analyze       (app/analysis)   activity, money, contracts, timing, behavior
      |
      v
    identity      (app/identity)   rule-based classification
      |
      v
    roast         (app/roast)      Gemini, with deterministic fallback
      |
      v
    compose       (app/core)       Wrapped object + cards
      |
      v
    Wrapped JSON

The entry point is `runPipeline()` in `app/core/pipeline.ts`.

## Folder responsibilities

    app/
      api/         HTTP routes (thin; delegate to core)
      core/        types, config, errors, range, cache, pipeline, Wrapped composition
      data/        provider access: rpc, alchemy, indexer interface, normalize
      analysis/    pure stat functions + behavioral scoring + compare
      identity/    rule table + scoring -> personality name
      roast/       prompt builder, Gemini call, fallback templates
      cards/       data-only card builder
      page.tsx     frontend placeholder (see "Frontend boundary")

    tests/         mirrors app/ structure; fixtures under tests/fixtures/
    scripts/       one-off dev tools (verify.mjs, etc.)
    docs/          this folder

## The critical rule

**The analysis layer must never import `app/data/alchemy.ts`.**

Analysis only ever sees our own domain models: `Transfer`, `Transaction`,
`Activity`, `Wrapped`. If we swap Alchemy for something else, only
`app/data/` changes. This is enforced by convention and reviewed on every PR.

## Data flow inside `app/data`

    alchemy.ts
      - paginates alchemy_getAssetTransfers
      - retries with exponential backoff on 429/5xx
      - translates provider errors into ProviderError
      |
      v
    normalize.ts
      - raw Alchemy shape -> Transfer (our model)
      - dedupes by uniqueId
      - groups into Transaction[]
      |
      v
    indexer.ts
      - the Indexer interface + getIndexer() factory
      - swappable for tests via setIndexerForTesting()

## Configuration

All environment access flows through `loadConfig()` in `app/core/config.ts`.
It validates with Zod and throws `ConfigError` if required values are missing.
Nothing else reads `process.env` directly except `pipeline.ts` for
`FORCE_ROAST_FALLBACK` (a deliberate escape hatch).

## Cache key

    wrapped:base:v1:<rangeKey>:<lowercased-wallet>

The version component (`v1`) is the schema version. Changing the analysis
algorithm requires bumping it, otherwise stale results get served.

## Logging and observability

`runPipeline()` returns per-stage timings in `timings`:

    { fetch, analyze, identity, roast, total }

These are surfaced in the API response for debugging. They are not used in
any analytics, so they cannot affect determinism.

## Frontend boundary

This repository currently ships a **placeholder** `app/page.tsx` (the
default Next.js scaffold). A separate frontend agent will eventually deliver
a real UI, which will then be integrated into this repository.

The backend provides a single coherent response shape (`Wrapped`) through a
small number of endpoints. The frontend must:

- consume `POST /api/wrapped` and `POST /api/compare`
- never call Alchemy or Base RPC directly
- never re-derive analytics, personality, or roast content
- treat the backend as the source of truth

See `docs/api.md` for the full contract.