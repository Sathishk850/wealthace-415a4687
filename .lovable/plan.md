# Global Market & Financial Events Calendar — Research Findings and Proposed Architecture

Research only. No code changes proposed for this turn beyond the architecture below, which needs your sign-off.

## Headline finding

No free or cheap single source gives all five fields (date/time, previous, forecast/consensus, actual, impact) across India, US, Eurozone/UK, Japan and China. The scarce, paid part is **forecast/consensus** and **impact rating** — those come from private analyst-panel aggregation, which is exactly what Trading Economics sells. Central banks and statistics offices publish dates and actuals only; by design they never publish a consensus forecast for their own release.

So the honest choice is:
- **Free-only stack** → dates + previous + actual are solid; forecast and impact show "Unavailable" (or impact comes from our own static rating table).
- **Free stack + one cheap paid feed** → adds forecast/consensus, at roughly $20–50/month, still far below Trading Economics.

## Source-by-source (verified vs. unverified)

| Source | Gives | Coverage | Cost / limits | Confidence |
|---|---|---|---|---|
| **Finnhub economic calendar** | dates, previous, estimate, actual | G7/major-economy focused; **India/RBI not confirmed** | **Paid-only** — separate "Economic-1" SKU, $50/mo billed quarterly, personal-use licence. Not in free tier | Pricing verified on Finnhub's economic-data pricing page; country list not verifiable without a paid key |
| **Alpha Vantage** indicators (CPI, REAL_GDP, FEDERAL_FUNDS_RATE, UNEMPLOYMENT, NONFARM_PAYROLL…) | actuals only, `{date, value}` series | **US only** — docs state all economic indicators return US data | Free tier **25 req/day, 5 req/min** (tightened from 500 → 100 → 25 historically). Premium $ tiers not confirmed | High on US-only + no-forecast; low on premium pricing |
| **FRED / ALFRED** (`fred/releases/dates`) | release **dates** + actuals via linked series | Strong US, plus many hosted international series | Free, key required, generous | High |
| **DBnomics** | actuals + dates, aggregates IMF/Eurostat/OECD/BLS | Wide incl. India CPI via IMF | **Free, no key, no paid tier** | High. Risk: it's a mirror, refresh latency vs. source unverified |
| **OECD SDMX / World Bank / IMF** | actuals | EU/UK/Japan/China macro | Free, no auth for public data | High. Monthly/quarterly latency, no release-clock granularity |
| **EODHD Economic Events API** | past + future events: date, previous, forecast, actual | "countries around the world", data from ~2020 | Requires paid Fundamental/Events package; base all-world plan from ~$19.99/mo | Endpoint exists and is documented; I tried the demo token today and got `Forbidden`, so field list incl. "impact" is **unverified** |
| **Financial Modeling Prep economic calendar** | economic data releases calendar | unverified (India?) | Free tier 250 calls/day; which tier unlocks the calendar is **unclear** | Low — demo key rejected today; needs a real free key to test |
| **Nasdaq Data Link** | global indicators DB | broad actuals | platform in transition (docs site retiring Aug 2026) | Low — no calendar-with-forecast product found |
| **Twelve Data / Polygon / Marketaux** | no economic calendar product found | — | — | Medium (absence of evidence) |
| **Investing.com / ForexFactory / investpy** | full calendar incl. forecast + impact | broad incl. India | free but **no official API; scraping violates ToS**; `investpy` has unresolved breakage | Recommend excluding from production |
| **RBI MPC calendar** | meeting **dates** (2026-27 published: 6-8 Apr, 3-5 Jun, 3-5 Aug, 5-7 Oct, 2-4 Dec 2026, 3-5 Feb 2027) | India policy | Free, authoritative, HTML only | High |
| **MoSPI Advance Release Calendar** | CPI/IIP/GDP release dates | India | Free, **PDF/HTML only**, needs parsing | High |
| **NBS China press-release calendar** | exact dates/times per indicator, English published | China | Free, HTML/PDF only; unofficial `EasyQuery` JSON API is unstable/Chinese-only | High for calendar page |
| **GST / Union Budget / PBOC LPR** | no API found | India / China | — | Would be manually curated (LPR is conventionally the 20th monthly — uncited) |

## Recommended architecture

Three layers, each independently degradable, so a missing layer shows "Unavailable" rather than a fabricated number.

1. **Event registry (our data, curated)** — one row per recurring event type: country, indicator, agency, cadence, our own **impact rating** (static, editorially assigned — this is the realistic way to get impact without paying for someone's proprietary tag), and which adapters can fill dates/actuals/forecast.
2. **Date layer (free)** — adapters per source: FRED `releases/dates` (US), RBI MPC page + MoSPI advance calendar (India), ECB/BoE/BoJ published meeting calendars, NBS China calendar. Where a source is PDF/HTML, we parse on a schedule and store into our own `market_events` table; the app never scrapes at request time.
3. **Value layer** — `previous`/`actual` from FRED + DBnomics/OECD (free, wide). `forecast` only if you add one paid feed (EODHD is the cheapest verified candidate); otherwise the field renders "Unavailable" everywhere and the UI is built to accept that as a first-class state.

Storage: a `market_events` table (country, indicator_key, event_at, tz, previous, forecast, actual, unit, impact, source, confirmed vs. estimated date) plus a scheduled refresh via a public cron route, reusing the existing provider pattern under `src/lib/market/providers/`. Read path is a server function; UI is a filterable calendar (by country, impact, week/month) with a "this week" digest that can feed the existing alerts/reminders surface.

## What I could not verify — and how to close it cheaply

Before committing, three free checks (each a signup, no payment):
1. **EODHD** free key → curl `/api/economic-events` and inspect actual fields: is there an `impact`/`importance` field, and do India/RBI and China/PBOC rows exist?
2. **FMP** free key → curl the economic calendar endpoint: is it gated, and what countries/fields come back?
3. **Finnhub** — only resolvable with a paid trial; I would not pay $50/mo blind given India coverage is unconfirmed.

Also unverified: Alpha Vantage premium prices, DBnomics refresh latency after a fresh MoSPI/RBI release, PBOC LPR schedule citation.

## My recommendation

Build layers 1–2 and the actuals half of layer 3 on the free stack now — that already delivers a genuinely useful calendar for all six regions with real dates and real actuals, and India/China coverage that generalist Western feeds handle badly. Assign impact ratings ourselves. Treat forecast/consensus as a deliberately deferred, paid add-on: run the two free key tests above, and only then decide between EODHD (~$20–50/mo) and living with "Unavailable" on that one field.

## Next step

Tell me which you want:
- **A**: free-only stack, forecast shows "Unavailable" — no recurring cost.
- **B**: free stack + I first verify EODHD/FMP fields with free keys, then we wire forecast in.
- **C**: something else (e.g. narrow scope to India + US first).
