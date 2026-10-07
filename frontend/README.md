# Onchain Wrapped — Frontend

> Spotify Wrapped for your Base wallet. Discover your onchain personality, activity stats, timing quirks, roasts, and head-to-head comparisons.

Built for the **Base** ecosystem with modern crypto aesthetic, editorial storytelling, dark premium visual design, and zero fake metrics.

---

## 1. Architecture & Folder Structure

```text
├── app/
│   ├── globals.css         # Tailwind styles & theme variables
│   ├── layout.tsx          # Root layout & OpenGraph metadata
│   └── page.tsx            # Landing page, URL param hydration, and state coordination
│
├── components/
│   ├── hero.tsx            # Landing hero, editorial typography, and action triggers
│   ├── input.tsx           # Large wallet address input with paste & quick test shortcuts
│   ├── range.tsx           # Timeframe selector (This Year, 90 Days, 30 Days, All Time)
│   ├── loading.tsx         # Intentional multi-stage loading experience
│   ├── wrapped.tsx         # Master story sequencer (Spotify Wrapped story format)
│   ├── cards.tsx           # Reusable CardShell and CardMotionWrapper visual container
│   ├── activity.tsx        # Card 1: Dominant transaction volume, active days, peak day
│   ├── identity.tsx        # Card 2: Personality reveal, affinity score, unboxed traits
│   ├── timing.tsx          # Card 3: Circadian rhythm, busiest hour, night volume bar
│   ├── money.tsx           # Card 4: Native sent/received in ETH, favorite token, no fake USD
│   ├── addresses.tsx       # Card 5: Counterparty exploration and frequent addresses (omitted if 0)
│   ├── roast.tsx           # Card 6: Visual punchline with 1–5 unsparing roast lines
│   ├── share.tsx           # Final summary poster, client-side image generator, link copy
│   └── compare.tsx         # Head-to-Head comparison screen with 6 category breakdowns
│
├── lib/
│   ├── api.ts              # Centralized typed API client (getWrapped, compareWallets)
│   ├── types.ts            # TypeScript interfaces matching backend V1 contract
│   ├── format.ts           # Number, address, date, percent, and friendly error formatters
│   └── sample.ts           # Authentic sample data matching backend contract for dev/preview
│
├── metadata.json
├── package.json
└── README.md
```

---

## 2. Running the Application

```bash
# Install dependencies
npm install

# Start local development server (Port 3000)
npm run dev

# Build for production
npm run build
```

---

## 3. How the API Layer Works

All API communication is centralized in `lib/api.ts`. No raw `fetch` calls exist inside individual UI components.

- `getWrapped(wallet: string, range: RangeOption): Promise<WrappedResponse>`
  - Issues `POST /api/wrapped` with `{ wallet, range }`.
  - Parses JSON response and validates HTTP status.
  - Automatically handles non-2xx responses by parsing `{ error: { code, message } }` into a typed `WrappedApiError`.
  - When running in isolated frontend preview before backend integration (e.g. 404 or connection unavailable), seamlessly falls back to authentic typed sample data (`lib/sample.ts`) matching the requested wallet or presets.
- `compareWallets(wallet: string, other: string, range: RangeOption): Promise<CompareResponse>`
  - Issues `POST /api/compare` with `{ wallet, other, range }`.
  - Parses side-by-side comparison payload and categorizes results.

---

## 4. Backend Field Consumption Mapping

| Component | Backend Field(s) Consumed | Notes |
| :--- | :--- | :--- |
| `identity.tsx` | `identity.name`, `identity.score`, `identity.traits`, `identity.rarity` | Never fabricates percentiles when `rarity === null`. |
| `activity.tsx` | `activity.transactions`, `activity.activeDays`, `activity.busiestDay` | Dominant tabular typography. |
| `timing.tsx` | `timing.busiestHour`, `timing.busiestDayOfWeek`, `timing.nightFraction`, `timing.lateNightFraction` | Circadian rhythm visual representation. |
| `money.tsx` | `money.nativeSent`, `money.nativeReceived`, `money.topToken`, `money.usdValuation` | Safe string parsing. Never renders fake USD amounts if `unavailable`. |
| `addresses.tsx` | `addresses.uniqueAddresses`, `addresses.top` | Omitted automatically if `uniqueAddresses === 0` (via `cards` array). |
| `roast.tsx` | `roast.lines`, `roast.source` | Renders 1–5 lines identically whether source is `gemini` or `fallback`. |
| `share.tsx` | Composite summary of `identity`, `activity`, `roast`, and `wallet` | High-resolution canvas download + link copy. |
| `compare.tsx` | `a`, `b`, `comparison.overall`, `comparison.categories` | Never recalculates winners or ratios; displays backend truth. |

---

## 5. Backend Integration Notes for Backend Agent

1. **API Endpoints**:
   The backend routes should accept:
   - `POST /api/wrapped` with `{ wallet: string, range: "year" | "last90" | "last30" | "all" }`
   - `POST /api/compare` with `{ wallet: string, other: string, range: string }`
2. **Error Envelope**:
   Return JSON formatted as:
   ```json
   {
     "error": {
       "code": "INVALID_WALLET",
       "message": "Invalid Base wallet address."
     }
   }
   ```
   Supported codes: `INVALID_WALLET`, `INVALID_RANGE`, `PROVIDER_ERROR`, `RATE_LIMITED`, `DATA_UNAVAILABLE`, `CONFIG_ERROR`, `ANALYSIS_ERROR`, `INTERNAL_ERROR`.
3. **Card Sequence**:
   The backend's `wrapped.cards` array is respected as the canonical rendering order. When `uniqueAddresses === 0`, simply omit `"addresses"` from `cards`.
4. **Sample Data**:
   Sample data in `lib/sample.ts` can remain for testing/demos or be removed. When `POST /api/wrapped` responds with valid JSON from your live backend, `lib/api.ts` directly returns the live backend data without touching `lib/sample.ts`.
