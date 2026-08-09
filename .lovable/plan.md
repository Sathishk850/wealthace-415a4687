# Wealth Ace — 6-issue implementation plan

## What already exists (so we don't rebuild it)

- **Reminder engine is real**: `alerts.functions.ts` derives bills, SIPs, EMIs, insurance renewals, corporate actions and rebalance alerts into the notifications table; `alerts-digest.tsx` shows them on sign-in; an hourly cron worker re-derives them server-side.
- **Reminders CRUD UI exists** with Upcoming / Completed / All tabs — but it is buried inside the Tools page, not its own page.
- **Reports are already extensive**: 18 report types with PDF / Excel / CSV export through a shared report engine, with period ranges. The `/reports` page itself is an empty stub — the real catalogue renders inside Tools.
- **Net worth page exists** at `/dashboard/networth`, but its snapshot button does nothing and the history chart is a placeholder box.
- **Wealth CSV/XLSX/JSON import exists**; the Money "Import" button is inert.

## Assumptions

- Tagline becomes **"Master Your Finances"** everywhere (replacing both "Direct Your Wealth" and the unused "Track. Nurture. Prosper." alt text). The logo artwork itself is unchanged — it already reads Wealth Ace.
- The 6 report types you listed (Summary, Net Worth, Portfolio, Expense, Investment, Tax) map onto existing report types; I'll surface them as a curated "core reports" set rather than deleting the other 12.
- Bank import writes into the existing money transactions table and reuses existing categories; no new schema.

---

## Phase 0 — Rebranding

- Replace every user-visible "FinVista" with "Wealth Ace": ~20 route `head()` titles, landing page copy + OG/Twitter meta, settings/PIN/PWA/session strings, scheduled-report copy.
- Update the report engine + report theme branding strings, PDF author/creator/keywords and footer.
- Set tagline to "Master Your Finances" in landing hero, meta, footer, logo alt text, report header.
- Point favicon / apple-touch-icon / PWA manifest at the existing Wealth Ace emblem asset; retire the `finvista-*` asset pointers still referenced by the planner tabs.

## Phase 1 — Net worth (Issue 3)

- Add a single source of truth `computeNetWorth()` in `wealth-api.ts`: assets (investment current value, cash/bank accounts, other assets) minus liabilities (loans, EMIs, credit cards). Both the dashboard and the net worth page consume it instead of duplicating the math.
- Wire the dead "Snap" button to the existing create-snapshot mutation.
- Daily automatic snapshot: extend the existing cron worker to upsert one snapshot per user per day (idempotent on user + date), so history builds without user action.
- Build out `/dashboard/networth`: current value with assets/liabilities breakdown, 12-month line chart from snapshots, composition pie, and a simple trend summary (change vs last month, best/worst month).

## Phase 2 — Insights & reminders surfacing (Issue 1)

- New `/insights` route: insight cards persisted per day, regenerated when the day rolls over (24h cadence) and invalidated immediately whenever wealth/money/planner data changes, so edits reflect instantly.
- New `/reminders` route with **All / Pending / Completed** tabs, reusing the existing reminders view rather than rewriting it.
- Add a dismissible high-priority **RemindersBanner** at the top of the dashboard, driven by unread urgent/high notifications (the sign-in digest modal stays as-is).
- Extend the alert sweep with goal-review and investment-review reminders on top of the existing bill/SIP/EMI/insurance/corporate-action coverage.

## Phase 3 — Maturity dates (Issue 2)

- Migration: add a maturity date column to investments.
- In the investment forms, when category is FD default maturity to today + 3 years; Bonds default to today + 5 years. Value stays editable and is never overwritten once the user touches it.
- Show maturity date on investment rows / holding detail.
- Alert sweep: reminder 30 days before maturity, escalated to high priority inside 7 days.

## Phase 4 — Shortcut routing (Issue 4)

- Add real pages where content is missing: `/goals`, `/goals/add`, `/goals/progress`, `/money/add`, `/money/budget`, `/money/accounts`, `/help`.
- Add thin alias routes that redirect to canonical existing pages, so every shortcut works without duplicating UI:
  - `/investments` → `/wealth`, `/investments/add` → `/wealth/add-investment`, `/investments/holdings` and `/investments/portfolio` → `/wealth` (holdings tab), `/tools/reports` → `/reports`, `/wealth/networth` → `/dashboard/networth`.
- Add a **quick-nav widget** in the header: a keyboard-openable command palette listing all shortcuts with fuzzy search.

## Phase 5 — Reports (Issue 5)

- Make `/reports` render a real report centre instead of a metadata-only stub: the 6 core report types front and centre, remaining types grouped below.
- Period selector: Monthly / Quarterly / Yearly (plus the existing custom range).
- Report layout pass in the engine: teal Wealth Ace header, summary block, detailed breakdown table, charts, disclaimer footer.
- Export row per report: PDF download, Excel with one sheet per section, and Print (print stylesheet + browser print).

## Phase 6 — Bank statement import (Issue 6)

- New importer component reachable from the Money transactions "Import" button.
- Five parser profiles — HDFC, ICICI, Axis, SBI, Generic CSV — detected from header row with manual profile override.
- Auto-derive per row: merchant name from the narration, Income / Expense / Transfer classification from debit/credit columns, and category via a keyword ruleset covering Food, Transport, Shopping, Utilities, Entertainment, Healthcare, EMI, Insurance, Travel, Education, Subscriptions, Investment.
- Preview table before commit: editable category/type per row, duplicate detection against existing transactions, per-row include/exclude.
- On save: bulk insert, global cache refresh so KPIs/charts recompute, and an insights regeneration trigger.

---

## Technical notes

- Data reads stay on the existing React Query + server-function pattern; insights/net-worth derivations go in `src/lib`, not in route components.
- New DB work is limited to: maturity date column on investments, and an insights cache table keyed by user + generated date. Both get RLS policies and grants scoped to `auth.uid()`.
- Daily snapshot and reminder generation extend the existing public cron hook — no new scheduling infrastructure.
- Alias routes use router redirects, so there is exactly one implementation per screen.

## Sequencing

Phases are independent enough to ship in order: 0 (branding) → 1 (net worth) → 2 (insights/reminders) → 3 (maturity) → 4 (routing) → 5 (reports) → 6 (import). I'll report back after each phase rather than at the very end.
