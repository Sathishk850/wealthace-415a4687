# Release notes, SIP tracker, and liabilities summary

## Scope
- Add version 2.0.0 at the top of the existing What's New data, adapting the supplied entries to its current string-list format.
- Enhance the existing SIP Tracker with next payment dates and a compact active/monthly/total summary using its actual investment fields.
- Add a compact liabilities summary using the existing `outstanding`, `emi`, and `interest_rate` fields.
- Leave Events, Auth, and Reports unchanged.

## Technical details
- Reuse `inrCompact` and existing Wealth queries; add no new data fetching or packages.
- Keep calculations pure and avoid mutating fetched arrays.
- Run `bunx tsgo --noEmit`, fix errors, and check the latest preview build result.
