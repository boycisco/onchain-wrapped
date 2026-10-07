# Analysis engine

Everything in `app/analysis/` is deterministic. Same input, same output.
No network, no clock (except the range boundaries supplied by the caller),
no randomness.

All statistics use **UTC** internally. A future user-timezone preference
would be applied at the presentation layer, not here.

## `activity.ts`

Produces `ActivityStats`.

- `totalTransactions` - count of unique `Transaction` objects
- `successfulTransactions` / `failedTransactions` / `unknownTransactions`
  - currently almost all transactions are `unknown`, because we do not
    enrich transaction receipts yet. We never count an `unknown` as
    `successful`.
- `activeDays` - number of unique UTC calendar days with at least one tx
- `spanDays` - `lastActiveDay - firstActiveDay + 1`
- `inactiveDays` - `spanDays - activeDays` (interior gap days only)
- `firstActivity`, `lastActivity` - ISO 8601 UTC timestamps
- `longestActiveStreak` - longest run of consecutive active days
- `longestInactiveStreak` - longest gap between two active days, in whole days
- `transactionsPerActiveDay` - `total / activeDays`, rounded to 2 decimals
- `busiestDay` - day with the most txs, ties broken by earliest date
- `busiestMonth` - month with the most txs, ties broken by earliest month

## `money.ts`

Produces `MoneyStats`.

- **Native** (external and internal categories): `sent`, `received`, `net`,
  counts, largest in / out / overall. All wei values are output as decimal
  strings (JSON has no bigint).
- **Tokens** (ERC-20 only): one entry per contract address. Totals are
  per-token; we never sum across tokens.
- **`mostUsedStablecoin`** - highest-transfer-count ERC-20 whose contract
  appears in the hardcoded Base mainnet stablecoin set. Ties broken by
  address ascending.
- **`mostUsedToken`** - highest-transfer-count token, same tie rule.
- **`usdValuation: "unavailable"`** - hardcoded. We do not have historical
  price data and will not invent one.

Self-transfers (`direction: "self"`) are excluded from sent and received
totals. They are still counted as transfers.

## `contracts.ts`

Produces `ContractStats`.

- `uniqueAddresses` - distinct non-null `to` addresses on transactions
  **initiated by this wallet** (i.e. the wallet is the `from`).
- `topAddresses` - sorted by interaction count descending, ties by address
  ascending. "Interactions" counts transactions, not transfers.
- `concentration` - fraction of sent transactions that went to the single
  top address, 0..1
- `topTenConcentration` - fraction that went to the top 10 addresses
- `firstInteractedAddress` - earliest by block number, ties by hash ascending
- `sentTransactions` - denominator for both fractions

**Naming note:** `uniqueAddresses`, not `uniqueContracts`. We do not verify
that these addresses are contracts (see `data.md`).

## `timing.ts`

Produces `TimingStats`. All times UTC.

- `byHour[0..23]`, `byDayOfWeek[0..6]` (Sun=0), `byMonth[0..11]` (Jan=0)
- `busiestHour`, `busiestDayOfWeek`, `busiestMonth` - highest count, ties
  by lower index
- Day / night split:
  - `day`   = 06:00 to 17:59 UTC
  - `night` = 18:00 to 05:59 UTC
- Late-night (`lateNight`): 23:00 to 04:59 UTC, a subset of night
- Weekday (Mon-Fri) vs weekend (Sat-Sun), UTC

Each bucket reports `{ key, count, fraction }` where `fraction` is
`count / total`, rounded to 4 decimals.

## `behavior.ts`

Produces five scores, each in `[0, 1]`. Higher means "more of that thing".

| Score | Formula |
|---|---|
| `activity` | `0.5 * log10(1+tx)/log10(1+500) + 0.3 * activeDays/spanDays + 0.2 * min(1, streak/30)` |
| `exploration` | `0.5 * log10(1+uniqueAddresses)/log10(1+100) + 0.3 * uniqueAddresses/sentTxs + 0.2 * min(1, tokens/20)` |
| `consistency` | `0.7 * activeDays/spanDays + 0.3 * min(1, streak/60)` |
| `loyalty` | `0.5 * concentration + 0.5 * topTenConcentration` |
| `timing` | `0.5 * night.fraction + 0.5 * lateNight.fraction` (higher = more night-owl) |

Saturation constants are declared in `SATURATION` at the top of the file.
Log scaling is used so a very active wallet does not simply max everything.

All scores round to 4 decimals.

## `identity/`

`app/identity/rules.ts` contains the entire rule table. Each rule is a pure
predicate over `BehaviorScores`. There are two roles:

- **core** - the noun of the identity (DEGEN, EXPLORER, GHOST, ...)
- **prefix** - an adjective (NIGHT OWL, DAYWALKER, VETERAN)

Classification picks the highest-weight matching core and, if it is not a
low-activity core (GHOST, TOURIST), the highest-weight matching prefix.

Name: `"THE [prefix] [core]"` or `"THE [core]"`.

Score: `round(100 * (0.30 * activity + 0.20 * exploration + 0.20 * consistency + 0.15 * loyalty + 0.15 * timing))`.

`rarity` is always `null` in V1. We do not have a population dataset and
will not fabricate a percentile.

Adding a rule is a one-line change in `rules.ts` plus a test in
`tests/identity/`.

## `compare.ts`

Takes two `Wrapped` objects and produces a `CompareResult`.

Six categories: `transactions`, `activeDays`, `uniqueAddresses`,
`activeStreak`, `nightFraction`, `nativeSent`.

Winner per category is exact (`a === b` -> tie). No fuzzy tolerance.

`nativeSent` parses the decimal string back into a BigInt for the
comparison; only the comparison uses `Number` and accepts small float
imprecision at extreme magnitudes, since the Wrapped keeps the exact value.

`compare()` never re-runs the analytics engine. It reads from the two
Wrapped objects that the pipeline already produced.

## What we do not do

- We do not price historical transactions.
- We do not claim a transaction "failed" or "succeeded" without a receipt.
- We do not claim an address is a contract without bytecode verification.
- We do not claim a percentile without population data.
- We do not use an LLM for anything that appears in `stats`, `money`,
  `behavior`, `identity.score`, or `compare`. The LLM writes prose only.