# Roadmap

## Expense Scanner (Expenses module, isolated)
- [ ] 1. Inspect Expenses page, TransactionDialog, money-api, categories, payment accounts, schema
- [ ] 2. `receipt_path` column + private `receipts` bucket with owner-only RLS
- [ ] 3. Server-side OCR function (Lovable AI gateway, strict JSON, no receipt logging)
- [ ] 4. Pure matching helpers: category, account, duplicate, prefill
- [ ] 5. Scan Expense dialog: source, upload/camera, reading, review, warnings, duplicates, manual fallback
- [ ] 6. Feed extracted values into existing TransactionDialog (no redesign)
- [ ] 7. Receipt upload after confirm; non-blocking warning on upload failure
- [ ] 8. Confirm manual Add Transaction flow unchanged
- [ ] 9. Typecheck, build, browser verification
