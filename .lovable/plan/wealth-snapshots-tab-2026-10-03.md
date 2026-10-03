# Wealth Snapshots tab

## Scope
- Add a **Snapshots** tab between Assets and Allocation on the existing Wealth page.
- Keep every other page and existing component unchanged.

## Implementation
1. Add a focused snapshot data module using the existing `wealth_snapshots` table and its actual fields (`snapshot_date`, totals, and annotation).
2. Build the Snapshots view with:
   - net-worth history chart and annotation markers
   - growth, best-month, and average summary cards
   - newest-first expandable history
   - recorded total changes between snapshots
   - clearly labelled current-holdings proxy for line items
   - note editing and confirmed deletion
   - loading, empty, error, and small-screen states
3. Wire the view into the Wealth tab switcher without altering other tabs.
4. Run `tsgo`, fix all type errors, then verify the Wealth Snapshots tab in the signed-in preview when a test session is available.

## Technical details
- Reuse the generated browser database client and the existing React Query key `['wealth', 'snapshots']`.
- Adapt the requested `captured_at` model to the database’s real `snapshot_date` field; no database migration is needed.
- Reuse existing Button, dialog, typography, color, and chart tokens rather than introducing hardcoded theme colors.
- Current assets, investments, and liabilities are shown only as a proxy and explicitly identified as current holdings, because historical line items are not stored per snapshot.
