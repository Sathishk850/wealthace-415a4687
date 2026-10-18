<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep Wealth snapshot reads and mutations in the dedicated snapshots API module so every snapshot surface shares one query key and the database's `snapshot_date` model.
- Keep earnings fetches in the shared server-only results calendar, IST/date/grouping rules in pure results helpers, and alert delivery in the existing notification worker with atomic channel claims so all Q Result surfaces and slots agree.
- Allow the Q Result worker's calendar and push dependencies to be injected for tests so delivery claims and retries are verified without notifying real users.
- Keep Held-in-account creation in the shared AccountSelect using AccountDialog's post-save callback, preserving label-based holding storage and existing account query invalidation.
- Keep cashflow bucketing and holding-performance ranking in pure financial-insights helpers so rules can be tested without fetching or rendering.
- Existing asset SIP settings stay in asset notes and are projected into SIP Tracker only; patch investment SIP columns separately to avoid duplicating holdings or changing valuation.
- Keep deposit accrual, RD instalment schedules and maturity timing in pure deposit-value helpers; apply valuation after transaction folding in the shared investments query so all investment consumers agree.
