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
- Keep cashflow bucketing and holding-performance ranking in pure financial-insights helpers so rules can be tested without fetching or rendering.
