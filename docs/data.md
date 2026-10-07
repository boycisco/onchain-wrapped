# Data layer

## Providers

| Provider | Purpose | Env var |
|---|---|---|
| Base RPC (via Viem) | block number, future receipt enrichment | `BASE_RPC_URL` |
| Alchemy | historical wallet transfers, all categories | `ALCHEMY_API_KEY` |

The Base RPC client lives in `app/data/rpc.ts`. It exposes a tiny facade
(`rpc.blockNumber()`) so callers never import Viem directly.

The Alchemy adapter lives in `app/data/alchemy.ts`. It is the only file
that knows about `alchemy_getAssetTransfers`.

## The `Indexer` interface

    interface Indexer {
      transfers(wallet: Address, range: Range): Promise<Transfer[]>;
    }

Implementations must:

- paginate fully, with a hard upper bound on pages (never infinite loops)
- retry transient failures with exponential backoff
- translate any provider error into `ProviderError`
- return transfers already normalized to our model

Analysis code depends only on this interface or on the models it returns.

## Normalization

`normalize.ts` converts raw Alchemy responses into `Transfer`. Key rules:

- **Native (external/internal)**: `asset = "ETH"`, `decimals = 18`, contract is null.
- **ERC-20**: `asset` from the response, `decimals` from `rawContract.decimal`, `contractAddress` from `rawContract.address`.
- **ERC-721**: `value = 1n`, `decimals = 0`, `asset = null`. No attempt is made to name the NFT.
- **ERC-1155**: `value` from `erc1155Metadata[0].value` if present, else `1n`.
- **Direction** is inferred from the wallet's position as `from` / `to`:
  - wallet is `from` only -> `out`
  - wallet is `to` only   -> `in`
  - wallet is both        -> `self`
  - wallet is neither     -> `in` (internal traces edge case; documented in code)

The `uniqueId` from Alchemy is preserved when provided (form: `hash:log:N`),
which uniquely distinguishes multiple similar events inside one transaction.
A fallback ID is constructed otherwise.

## Pagination

Alchemy paginates via an opaque `pageKey`. Our adapter:

1. Queries outgoing (`fromAddress = wallet`) and incoming (`toAddress = wallet`) separately.
2. Requests `order: "desc"` so the newest transfers come first.
3. Stops early if the oldest transfer on the current page predates the range start.
4. Caps at `maxPages` (default 10, so up to 10,000 transfers per direction).
5. Dedupes on `uniqueId` after normalization.

Tests in `tests/data/alchemy.test.ts` cover:
- multi-page pagination in both directions
- the page-limit guard
- range filtering
- 429 retry behavior

## Adding another indexer (e.g. Moralis)

1. Create `app/data/moralis.ts` implementing the `Indexer` interface.
2. Return `Transfer[]` from `normalize.ts` helpers, or write your own normalizer.
3. Update the factory in `app/data/indexer.ts` to select the provider
   (environment variable or config flag).
4. Do **not** touch `app/analysis/`, `app/identity/`, `app/roast/`, or any API route.

That is the entire change surface.

## Known limitations

- We do not verify on-chain that a `to` address is a contract. The
  `uniqueAddresses` stat in `app/analysis/contracts.ts` counts every
  non-null `to` address. Later enrichment via `eth_getCode` is a planned
  extension.
- We do not fetch transaction receipts, so `Transaction.status` is always
  `"unknown"`. Adding an enrichment pass would let `activity.ts` report real
  success/fail counts.
- We do not fetch historical prices, so `MoneyStats.usdValuation` is always
  `"unavailable"`. We never fabricate a USD figure.