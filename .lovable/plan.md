# Expense Scanner for the Expenses module

Add a "Scan Expense" path that reads a receipt photo or PDF, extracts the expense details, and pre-fills the **existing** Add Transaction form for review. Nothing about the current manual flow, styling, categories, or payment accounts changes.

## Flow

```text
Scan Expense  ->  camera / photo / PDF  ->  reading receipt
   ->  review card (amount, date, merchant, category, account, currency, warnings)
   ->  existing Add Transaction form, pre-filled
   ->  user confirms  ->  expense saved + receipt attached
```

## What the user gets

- A **Scan Expense** button beside the existing Add button on the Expenses page.
  - Take Photo (camera on phones), Choose Image, Upload PDF. JPG/PNG/WEBP/HEIC/PDF.
- While reading: a progress state; on failure, a plain-language reason plus "Enter manually" which opens the normal empty form with the file kept.
- A **Review scanned expense** step showing the receipt preview alongside every detected value, each marked confident / needs review / not detected.
  - Detected amount, date, merchant, tax, discount, tip, invoice number, payment method, card last-4, location, and line items (name, qty, unit price, tax, total) when present.
  - Suggested category from the existing expense categories only, and a suggested Paid From account matched against the user's existing payment accounts. Both stay fully editable; unmatched account shows "Select account".
  - Warnings shown where relevant: amount not read, multiple totals found, date not found, category needs review, possible duplicate.
- **Possible duplicate expense** panel comparing against existing expenses (merchant + amount + near date, or same invoice number), with Cancel / Edit / Save anyway. Nothing is ever overwritten or deleted.
- Continue to the normal form: amount, date, merchant, category, note, payment mode and Paid From all pre-filled where known. Saving is blocked until amount is present, exactly like today. Notes carry tax/GST, invoice number, line items and other extras so nothing is lost.
- After saving, the receipt is attached to the expense and viewable when opening it again.

## Technical notes

- **OCR**: new `src/lib/expense-scan.functions.ts` server function using the Lovable AI gateway with a strict JSON schema (Gemini multimodal for images; PDFs sent as a file part). Returns per-field values plus a confidence level per field. The file is passed as base64 from the browser to the server function; nothing about the receipt is logged.
- **Category matching**: reuse `src/lib/import/categorize.ts` (existing merchant classifier + learned rules) and map its result onto the user's `money_categories` rows. No new category system.
- **Account matching**: match detected method/bank/last-4 against `usePaymentAccounts()` rows via `src/lib/payment-accounts-api.ts` helpers; fall back to blank.
- **New UI files** (no edits to existing pickers, asset flows, or the import engine):
  - `src/components/money/expense-scan-dialog.tsx` — source choice, upload, reading state, review card, duplicate panel, errors.
  - `src/lib/expense-scan-match.ts` — pure helpers: category/account matching, duplicate detection, prefill mapping.
- **Existing files touched, minimally**:
  - `src/routes/_app.money.tsx` — add the Scan button and let `TransactionDialog` accept an optional prefill + review banner.
  - `src/lib/money-api.ts` — accept an optional `receipt_path` on upsert.
- **Storage**: private `receipts` bucket with owner-only RLS policies (user-id-prefixed paths), plus a `receipt_path` column on the expenses table. If the upload fails, the expense still saves.
- Verification: typecheck and build, then a browser pass over scan entry, review, duplicate warning, and unchanged manual entry.
