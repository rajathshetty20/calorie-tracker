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

# Verifying a change

`npx tsc --noEmit`, `npm run lint`, `npm run build` and `npm test` all passing does
**not** mean a change works. That set cannot catch a function passed across the
server/client boundary, text clipped inside a form control, a chart that renders
empty, or data that is simply wrong. Every user-visible bug that reached production
in this codebase passed all four first.

**After changing a screen, load it and look at it.** Not the DOM — the pixels.

```bash
# headless Chrome with a debugging port
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --remote-debugging-port=9222 \
  --user-data-dir=/tmp/cdp --no-first-run about:blank &
```

Drive it over CDP: `Emulation.setDeviceMetricsOverride` for the viewport (the app is
iPhone-first — use 402x874 @3x), `Emulation.setEmulatedMedia` with
`prefers-color-scheme` for themes, `Page.captureScreenshot` for the picture. Then
actually view the PNG.

Two traps in that workflow, both of which have produced false results here:

- `Page.captureScreenshot` takes `clip` in **document** coordinates, not viewport.
- `captureBeyondViewport: true` re-lays out the page, which makes Recharts'
  `ResponsiveContainer` report `width(-1)` and render an **empty chart**. Scroll the
  element into view and capture normally instead.

## What automated checks miss

Assertions are worth writing, but know their blind spots — each of these produced a
confident "pass" over a real defect:

- `scrollWidth === clientWidth` says nothing about **form controls**, which clip
  internally. A time input rendered `10:15 PN`, losing the meridiem, with no overflow
  reported anywhere.
- A contrast checker that does not composite **alpha** measures text against the wrong
  backdrop. Ours reported six failures on the timer bar and demo banner; all six were
  the checker's own bug.
- `datetime-local` renders completely differently on Chrome and iOS Safari, so its
  width cannot be tested locally at all. Prefer primitives that render predictably —
  separate `type="date"` and `type="time"`.

## Audit the pattern, not the reported instance

When a defect is found in one place, check every sibling for the same shape before
calling it fixed. A duplicate legend was removed from the calories chart and left in
the time chart; auditing all six charts against one checklist then found that *four
of six* Y axes had no unit at all, and the aggregation tag wording had diverged.

## Traps specific to this app

- **Days come from `settings.timezone`**, never the server clock. Developing in IST
  hides bugs that only appear on Vercel (UTC) between midnight and 05:30 local. Test
  with `TZ=UTC npm run dev` before shipping anything that touches dates.
- **Inputs under 16px make iOS zoom the page** and never zoom back. `input`/`textarea`
  are pinned to 16px below `md` in `globals.css`. `select` is deliberately excluded —
  it opens a picker, never zooms, and 16px there is oversized.
- **Demo data must never contain entries in the future.** The generator lays out a
  whole day at fixed clock times; a visitor at 04:00 was shown a meal eaten at 08:30.
  Today's schedule is compressed into the elapsed part of the day.
- **HTML `step` validates relative to `min`.** `step="50" min="1"` made 1000 invalid,
  so `requestSubmit()` silently refused to fire and Settings could not be saved by
  anyone on the default bottle size. Use `step="any"` and validate in JS, which can
  report the problem visibly.
