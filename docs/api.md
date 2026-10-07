# API

Base URL (local): `http://localhost:3000`

All endpoints accept and return JSON. Error responses use one consistent
shape (see "Error envelope" below).

---

## `GET /api/health`

Cheap liveness check. Pings Base RPC for the current block number.

**Response 200**

    {
      "ok": true,
      "chain": "base",
      "block": "34567890",
      "latencyMs": 234,
      "timestamp": "2026-08-15T12:34:56.789Z"
    }

---

## `POST /api/wrapped`

Generate a full Wrapped for one wallet.

**Request**

    {
      "wallet": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "range": "year"
    }

- `wallet` (string, required) - EIP-55 checksummed or lowercase hex address.
- `range` (string, optional, default `"year"`) - one of
  `"year"`, `"last90"`, `"last30"`, `"all"`.

**Response 200**

    {
      "wrapped": { ...Wrapped... },
      "timings": {
        "fetch": 812,
        "analyze": 34,
        "identity": 0,
        "roast": 1240,
        "total": 2086
      }
    }

### The `Wrapped` object

    {
      "schemaVersion": 1,
      "wallet": "0x...",            // EIP-55 checksummed
      "range": { "start": "ISO", "end": "ISO" },
      "stats": {
        "activity": { ...ActivityStats... },
        "contracts": { ...ContractStats... },
        "timing":   { ...TimingStats... }
      },
      "money":   { ...MoneyStats... },
      "behavior": { "activity": 0.8, "exploration": 0.6, "consistency": 0.4, "loyalty": 0.5, "timing": 0.7 },
      "identity": {
        "name": "THE NIGHT OWL DEGEN",
        "score": 87,
        "rarity": null,
        "traits": ["high night activity", "high activity, bursty pattern"],
        "matchedRuleIds": ["night_owl", "degen"]
      },
      "roast": {
        "lines": ["...", "..."],
        "source": "gemini",
        "fallbackReason": null
      },
      "highlights": [],
      "cards": [ ...Card[]... ],
      "generatedAt": "ISO"
    }

Notes for the frontend:

- **`wallet` is EIP-55 checksummed.** Any comparison against user input must
  be case-insensitive.
- **`range.start` / `range.end` / `generatedAt` are ISO 8601 UTC strings.**
- **All wei / token amounts are decimal strings**, not numbers. Use `BigInt()`
  if you need math.
- **`identity.rarity` is always `null` in V1.**
- **`money.usdValuation` is always `"unavailable"` in V1.**
- **`roast.source`** is `"gemini"` or `"fallback"`. Fallback is fully
  functional; treat it as a normal value, not an error.
- **`cards`** is the recommended rendering unit. Each card is data-only.

### Card types

| id | Payload highlights |
|---|---|
| `activity` | `transactions`, `activeDays`, `busiestDay` |
| `identity` | `name`, `score`, `traits` |
| `timing` | `busiestHour`, `busiestDayOfWeek`, `nightFraction`, `lateNightFraction` |
| `money` | `nativeSent`, `nativeReceived`, `topToken` |
| `addresses` | `uniqueAddresses`, `top` (up to 5) |
| `roast` | `lines` (1-5) |

Cards are always in this order. `addresses` is omitted when
`uniqueAddresses === 0`.

---

## `POST /api/compare`

Compare two wallets side-by-side.

**Request**

    {
      "wallet": "0x...",
      "other": "0x...",
      "range": "year"
    }

- `wallet` and `other` must be different addresses.
- Range is applied to both sides.

**Response 200**

    {
      "a": { ...Wrapped... },
      "b": { ...Wrapped... },
      "comparison": {
        "overall": "A" | "B" | "tie",
        "aWins": 4,
        "bWins": 2,
        "ties": 0,
        "categories": [
          {
            "id": "transactions",
            "label": "Transactions",
            "aValue": 1842,
            "bValue": 421,
            "winner": "A",
            "difference": 1421,
            "ratio": 4.38,
            "summary": "0x1234...5678 had 4.38x more than 0xabcd...ef01 on transactions."
          },
          ...
        ],
        "summary": [ "overall sentence", "per-category sentences..." ]
      },
      "timings": { "a": {...}, "b": {...}, "total": 4210 },
      "cached": { "a": false, "b": true }
    }

Categories are exactly: `transactions`, `activeDays`, `uniqueAddresses`,
`activeStreak`, `nightFraction`, `nativeSent`.

---

## Error envelope

Every error response, from every endpoint, uses this shape:

    {
      "error": {
        "code": "INVALID_WALLET",
        "message": "Invalid Base wallet address."
      }
    }

Codes and HTTP statuses:

| Code | Status | When |
|---|---|---|
| `INVALID_WALLET` | 400 | Malformed or missing wallet address |
| `INVALID_RANGE` | 400 | Unknown range key |
| `PROVIDER_ERROR` | 502 | Upstream RPC or indexer failed |
| `RATE_LIMITED` | 502 | Upstream rate limit |
| `DATA_UNAVAILABLE` | 502 | Provider returned no usable data |
| `CONFIG_ERROR` | 500 | Missing required env var at runtime |
| `ANALYSIS_ERROR` | 500 | Internal analysis failure |
| `INTERNAL_ERROR` | 500 | Anything else |

Provider error messages, stack traces, and API keys are **never** exposed
to the client. Errors are logged internally only.

---

## Rate limits and caching

Server responses set `Cache-Control: private, max-age=0, must-revalidate`.
The server also caches full Wrapped results in-memory for 5 minutes, keyed
by `(range, wallet)`. Repeat calls within that window return immediately
and are marked `cached: true`.

Cache is per-process. Redis can be swapped in later via the `Cache`
interface in `app/core/cache.ts` without changing API consumers.

---

## Full example request

    curl -X POST http://localhost:3000/api/wrapped ^
      -H "Content-Type: application/json" ^
      -d "{\"wallet\":\"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\",\"range\":\"year\"}"

(Windows `cmd`. On PowerShell, use `Invoke-RestMethod`.)


---

## Inspecting responses from PowerShell

Windows PowerShell 5.1 (and even PowerShell 7 in some terminals) may display
non-ASCII characters in JSON responses incorrectly, because
`Invoke-RestMethod` decodes the response body using the console codepage
rather than UTF-8. You may see `â¦` instead of `…`, or other mojibake.

**This is a client-side display issue, not a server issue.** The API always
responds with `Content-Type: application/json; charset=utf-8` and UTF-8
bytes. Browsers, Node clients, `curl.exe`, and Postman read it correctly.

To inspect responses byte-accurately from Windows, use:

    curl.exe -s -X POST http://localhost:3000/api/wrapped ^
      -H "Content-Type: application/json" ^
      -d "{\"wallet\":\"0x...\"}"

Or set the PowerShell output encoding first:

    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8