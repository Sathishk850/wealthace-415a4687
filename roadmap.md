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
