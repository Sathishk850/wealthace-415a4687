# Market Data Service — Implementation Plan

## Defaults I'll use (tell me if you want otherwise)

- **Stocks provider**: Yahoo Finance active by default (no API key needed). Twelve Data provider file scaffolded — set `TWELVE_DATA_API_KEY` secret later and it becomes primary automatically.
- **Mutual Funds**: MFAPI (keyless).
- **Refresh model**: Client-side per open tab (matches your spec — pause on background, resume on focus, 5/10/15 min interval, immediate refresh on Dashboard/Wealth/Investments open).
- **CORS**: Provider calls go through a TanStack server function (`getMarketQuotes`) — never from the browser to Yahoo/Twelve/MFAPI directly. This is what makes it "one centralized service".

## Deliverables

### 1. Database (one migration)

Add to `wealth_investments` (all nullable, no data touched):
- `identifier_type` text
- `identifier` text
- `exchange` text
- `price_source` text
- `price_updated_at` timestamptz
- `previous_close` numeric

New table `market_price_cache`:
- `id`, `identifier_type`, `identifier`, `latest_price`, `previous_close`, `currency`, `source`, `fetched_at`, `expires_at`
- Unique index on (`identifier_type`, `identifier`)
- RLS: `SELECT` for `authenticated` (shared price data); writes only via service role
- GRANTs per project rules

Cache is user-agnostic (prices are public); server function uses service role to upsert.

### 2. Provider layer — `src/lib/market/`

```
market/
├── types.ts              # Provider, Quote, SearchResult interfaces
├── providers/
│   ├── yahoo.ts          # Stocks (primary until Twelve Data key added)
│   ├── twelvedata.ts     # Activates when TWELVE_DATA_API_KEY set
│   └── mfapi.ts          # Mutual funds (search + NAV)
├── calendar.ts           # Market calendar (NSE/BSE/US) — extensible
├── registry.ts           # Provider selection (primary + fallback chain)
└── service.ts            # Public API: getQuotes(), search(), refreshAll()
```

New provider = one new file in `providers/`, register in `registry.ts`. No module changes.

### 3. Server functions — `src/lib/market.functions.ts`

- `searchInstrument({ query, kind })` — proxies to Yahoo search or MFAPI search
- `getMarketQuotes({ items })` — batch fetch; reads cache first, refreshes stale entries, upserts cache, returns quotes
- `refreshUserHoldings()` — refresh all active holdings for current user (excludes sold/archived/deleted flag if present, else all)

All authenticated via `requireSupabaseAuth`. Server-only imports (fetch to providers, `supabaseAdmin` for cache upserts) stay inside handlers.

### 4. Client hooks — `src/lib/market/use-market-data.ts`

- `useMarketQuotes(items)` — TanStack Query, staleTime keyed to market status (5 min open / until NAV update for MFs / until market open for closed stocks)
- `useMarketStatus(exchange)` — 🟢/🔴 + last updated
- `useAutoRefresh(interval)` — visibility API pause/resume, focus refresh
- Never overwrites cached quote with 0/NaN/null

### 5. Investment identification UI

Non-invasive additions to `investment-dialog.tsx`:
- New "Search instrument" combobox above the existing Name field
- On select: auto-fills `name`, `identifier`, `identifier_type`, `exchange`, `symbol`
- Purely additive — existing manual entry still works for offline/custom holdings

New `link-investment-button.tsx` shown on rows/cards where `identifier` is null in `investments-view.tsx` — opens the same search dialog scoped to that holding. Plus one "Link All" action in the view header that walks unlinked holdings.

### 6. Portfolio value derivation

New helper `src/lib/market/derive.ts` — takes investment + latest cache row, returns `{ current_price, current_value, day_change, unrealized_pl, return_pct }`. `investments-view.tsx`, dashboard net-worth panels, and reports read via this helper. Existing DB values remain the fallback when no identifier is linked.

**No writes to `wealth_investments.current_price` from refresh** — spec says cache-only. Values are computed at render time from holding + cached price.

### 7. Settings — Market Data panel

Section in `_app.settings.tsx`:
- Provider status (Stocks primary/fallback, MF)
- Refresh interval selector (5/10/15 min)
- Auto-refresh toggle
- Last successful refresh timestamp
- "Refresh Now" button

Preferences stored in existing `user_preferences` JSON store.

### 8. Market status badge

Small `<MarketStatus />` component used on Dashboard/Wealth/Investments headers and Reports meta. Uses `calendar.ts` — no hardcoded timings inline.

### 9. Reports

`report-engine.ts` gets a `marketAsOf` field on `ReportDoc`. When present, renders "Market Price As Of DD/MM/YYYY HH:MM • Source" under the report header. Wealth/Investment reports populated from latest cache timestamp.

## Technical notes

- Yahoo endpoints: `query1.finance.yahoo.com/v8/finance/chart/{symbol}` (quote), `query2.../v1/finance/search` (search). No key.
- Twelve Data: `api.twelvedata.com/quote?symbol=X&apikey=...`. Scaffolded, inactive until secret exists.
- MFAPI: `api.mfapi.in/mf/search?q=X` and `/mf/{scheme_code}` — returns latest NAV.
- All provider fetches server-side (CORS + key protection).
- Batching: server function accepts up to 50 identifiers per call, dedupes.
- Cache TTL: stocks 5 min during market hours, until next open when closed. MFs until next NAV publish (~7 PM IST).

## Non-goals (per your "Do NOT modify" list)

- No changes to existing CRUD, calculations, RLS, theme, auth.
- No overwriting of purchase history, avg_price, quantity, or invested totals.
- No changes to how existing reports compute totals — they'll just prefer cached market price when a linked identifier exists.

## Verification

- `tsgo` clean.
- Migration runs.
- Add one Indian stock via search → identifier stored, quote shows.
- Add one MF via search → scheme code stored, NAV shows.
- Kill network → cached values persist, "Using cached market data" banner appears.
- Toggle refresh interval → next refresh honors it.

**Ready to proceed with these defaults?** If you want Twelve Data live at ship, say so and I'll request the key first. Otherwise I'll build against Yahoo + MFAPI and Twelve Data auto-activates when you drop in the key later.