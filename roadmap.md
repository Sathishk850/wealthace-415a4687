# Expense Scanner (Expenses module)

- [x] 1. Inspect Expenses page, transaction dialog, categories, payment accounts, schema
- [x] 2. Private `receipts` storage bucket (owner-only RLS) + `receipt_path` column
- [x] 3. Server-side receipt reader (strict JSON, no logging of receipt contents) — verified against a real PDF
- [x] 4. Pure matching helpers (category, payment mode/account, duplicates, note prefill)
- [x] 5. Scan Expense dialog (source pick, reading, review, warnings, duplicates, manual fallback)
- [x] 6. Prefill into existing Add Transaction dialog (manual flow untouched)
- [x] 7. Receipt upload after save; non-blocking warning on failure
- [x] 8. Manual Add Transaction flow unchanged (same fields, validation, save path)
- [ ] 9. Signed-in browser verification — blocked: no test session can be created in this environment

## Scan feature inspection (2026-09-19)
- [ ] Report scan files, failure mode, OCR backend, console/TS errors (read-only)

# Ledger theme

- [x] Add Ledger tokens and typography
- [x] Add Ledger to Settings and header switcher
- [x] Extend charts and planner palette
- [ ] Verify desktop/mobile, persistence, typecheck, and build

- [x] Goal milestones + contribution trend in goal detail view
- [x] Dashboard per-asset-class sparklines from existing snapshots
- [x] Settings Notifications section (prefs + push toggle)

# Financial insights additions

- [x] Verify existing monthly comparison, gainers/losers, and FIRE readiness before adding anything
- [x] Add missing Money six-month income/expense comparison using loaded transactions
- [x] Add missing Wealth gainers/losers using loaded holding valuations
- [x] Skip duplicate FIRE readiness: existing Planner overview and FIRE tab already show number, progress and years to FI
- [x] Run requested TypeScript check and verify affected views

# Fund picker and existing asset SIP

- [x] Put Equity first and Thematic immediately after Hybrid
- [x] Add accessible SIP settings to existing asset and investment details
- [x] Show enabled existing assets in SIP Tracker without moving or duplicating holdings
- [x] Verify SIP rules and preview

# High-priority UX gaps

- [x] Add Money bulk re-categorize action
- [x] Sort transaction categories by recent same-kind usage
- [x] Add goal emoji, notes, sorting and achieved-goal collapse
- [x] Add Dashboard holdings asset-class filters
- [x] Run TypeScript check and verify affected views
