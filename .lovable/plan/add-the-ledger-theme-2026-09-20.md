# Add the Ledger theme

## Goal
Add **Ledger** as a third, selectable light appearance without removing or changing the existing System, Light, or Dark options.

## Implementation
- Extend the saved appearance type and Settings theme picker with a **Ledger** option and a small paper-toned preview swatch.
- Update runtime theme handling so `ledger` is persisted, restored after reload, removes dark mode, and applies a dedicated `ledger` class to the document.
- Keep the header theme shortcut easy to use by cycling **Dark → Light → Ledger**, with an appropriate icon and tooltip for the active theme.
- Add Ledger design tokens in the global theme stylesheet for paper surfaces, warm ink, rule lines, forest-green accents, gains, losses, gold highlights, and subtle card shadows.
- Add Source Serif 4 and IBM Plex Mono as local font packages; use serif headings and monospaced/tabular financial figures only while Ledger is active, while keeping Inter for body/UI text.
- Add Ledger-scoped styling for shared cards, tables, inputs, selections, scrollbars, and common positive/negative utility colors so the aesthetic applies throughout the app rather than one page.
- Preserve all existing dark-theme variables and behavior unchanged.

## Technical details
- Files expected to change: `src/styles.css`, `src/routes/_app.settings.tsx`, `src/components/app-shell.tsx`, and package dependency files for the two fonts.
- The existing profile `theme` field is unrestricted text, so no database migration is needed.
- Theme classes will be mutually exclusive (`dark` or `ledger`) and the existing `fv-theme` storage key will continue to restore the active appearance.

## Verification
- Run the TypeScript check and inspect the automated preview build result.
- Verify in the browser that Settings can preview Ledger immediately, save it, survive reload, and switch back to every existing option.
- Check key desktop and mobile screens for readable text, aligned figures, warm paper surfaces, and no layout regressions.
