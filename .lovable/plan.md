# Fix mobile receipt source buttons

## Scope
- Keep the existing scanner design and OCR flow unchanged.
- Replace the fragile visually-collapsed file inputs with full-size native file inputs layered over each source control, so the phone receives the tap directly.
- Keep separate camera, gallery, and PDF file types; preserve camera capture on the camera control.
- Verify type checking, preview build, and mobile file-chooser activation.

## Technical detail
- Change only `src/components/money/expense-scan-dialog.tsx` unless verification exposes a directly related blocker.
- Avoid scripted `.click()` for touch activation and ensure the controls remain accessible by keyboard and screen readers.
