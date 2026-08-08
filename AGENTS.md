<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Demo mode must stay in sync

`/demo` (plus `/demo/history`, `/demo/settings`) renders the *real* page components with an in-memory sample dataset from `lib/demo-data.ts` — there are no demo rows in the database. When you change what the app tracks or shows, update the demo in the same change:

- New or changed table/column (`supabase/schema.sql`, `lib/types.ts`) → extend the generator in `lib/demo-data.ts` so the field is populated with plausible values.
- New tracked domain or page → add its sample data, a demo branch in the page's no-session path, and a `/demo/...` mirror route.
- Keep the generator deterministic: it uses a fixed-seed PRNG and dates relative to today — never `Math.random()` or varying seeds, so every visitor sees identical data.
- The demo must keep exercising the awkward paths: one **running** timer (so the timer bar is visible) and sleep entries that **cross midnight** (so the day-split is demonstrated, not just implemented).
- Writes are blocked by the missing session: any new write component must check `supabase.auth.getUser()` before writing and show the inline "Saving is disabled in the demo — sign in to track your own." message (see `MealForm.tsx` for the pattern).

A quick check after UI changes: load `/demo` logged-out and confirm the new feature shows populated sample data.
<!-- END:nextjs-agent-rules -->

# Time is stored as intervals

`time_entries` holds `(started_at, ended_at)` and nothing else — no `spent_on`, no `minutes`.
An entry that crosses midnight belongs to *both* days, so any stored day or duration would be
a lie. `splitByDay()` in `lib/time.ts` distributes an interval across local days at read time,
and a day query is an overlap test, not an equality:

```
started_at < day_end and (ended_at is null or ended_at > day_start)
```

- A running stopwatch is a row with `ended_at is null`. A partial unique index allows only one
  per user; starting another category goes through the `start_timer` RPC, which closes the old
  entry and opens the new one in one statement.
- `started_at` may be in the future — that is the whole implementation of "start in 15 minutes".
  Nothing is scheduled anywhere.
- Day boundaries come from `settings.timezone`, never from the server's own clock or the
  browser. `todayISO()` is *not* safe for user-facing days; use `localDateISO(new Date(), tz)`.
- `lib/time.test.ts` covers the split, including both DST transitions. Run `npm test` after
  touching anything in `lib/time.ts`.

# Keep the logo in sync

Geometry lives in `app/logoMark.ts`. `app/Logo.tsx` and the generated icons read from it;
`app/icon.svg` is a static file that must be updated by hand to match.
