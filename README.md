# Daily Tracker

**[▶ Try the live demo](https://calorie-tracker-green-eta.vercel.app/demo)** — 90 days of sample data, no sign-up.
&nbsp;·&nbsp; [Live app](https://calorie-tracker-green-eta.vercel.app/) (magic-link sign-in)

A self-hosted personal health dashboard: log **meals & macros, water, weight, exercise, and time** on one screen, and see 90 days of trends on another. Built with Next.js and Supabase, designed mobile-first so logging takes seconds.

> Originally a calorie counter, it grew into a full daily tracker — the UI is organized as a glanceable dashboard (status first, forms collapsed until you need them).

<!-- Screenshots: add docs/today.png and docs/history.png, then uncomment.
| Today | History |
|---|---|
| ![Today dashboard](docs/today.png) | ![History charts](docs/history.png) |
-->

## Features

- **Calories & macros** — log meals as carbs/protein/fat grams; calories are derived (4/4/9 kcal per g) and tracked against a configurable daily target with a per-macro split.
- **Meal autocomplete** — previously logged meals become one-tap presets that prefill the macros, so a repeated breakfast is a two-tap log.
- **Water** — tap +/− to log by the bottle (bottle size configurable), stored in ml.
- **Weight** — one upserted entry per day, charted over time.
- **Exercise** — log named lifts as sets (weight × reps); picking a previous exercise prefills your last session's sets so you only tweak the numbers. History charts top-set weight, volume, and estimated 1RM (Epley).
- **Time tracking with a stopwatch** — tap a category to start timing; starting another *switches*, closing the previous entry at the same instant so the day stays contiguous. Start with an offset (−30…+30 min) so you can set a sleep timer before you actually fall asleep. Entries are stored as intervals and can be nudged afterwards, and one that crosses midnight is divided between both days (22:00 → 06:00 counts 2h to one day and 6h to the next).
- **History** — 90-day charts for everything, each with a 7-day average ± standard deviation.
- **At-a-glance dashboard** — today's status (calories, macros, water, weight, exercise, time) is visible without scrolling; add-forms are collapsed behind `+ Add` disclosures.
- **Public demo** — `/demo` mirrors Today and History with a deterministic 90-day sample dataset, reached via a "Browse the demo" link on the login page. The full UI is explorable — forms, autocomplete presets, water taps — and only saving is blocked, with an inline notice at the moment of the attempt. An amber banner and nav badge mark the mode; nothing in demo mode can touch the database.
- Dark mode, responsive layout, and optimistic updates where it matters (water taps).

## How it's built

- **Next.js 16 (App Router) + React 19 + TypeScript** — pages are Server Components that fetch everything for the day in one `Promise.all`; interactivity (forms, autocomplete, optimistic water taps) lives in small client components.
- **Supabase** — Postgres with row-level security (every table is scoped to `auth.uid()`), magic-link email auth, and session refresh handled in Next.js middleware.
- **Tailwind CSS 4** for styling, **Recharts 3** for charts, **Vercel** for hosting.
- Natural-key upserts (`user_id + date`) keep daily singletons like water and weight idempotent — re-logging replaces instead of duplicating.
- **Time is stored as intervals, split on read.** A cross-midnight entry belongs to two days, so no per-day column or stored duration could stay honest; `splitByDay()` distributes it against local midnights, DST included. A running stopwatch is just a row with no end yet — nothing runs in the background and a timer costs no battery.
- Every write goes through one guarded path (`useWrite`) whose in-flight lock is set synchronously before the first `await`, so a double-tap on a slow connection can't insert twice.

## Setup

### 1. Supabase

1. Create a project at https://supabase.com (free tier is fine).
2. In **SQL Editor**, paste and run `supabase/schema.sql` (tables + RLS policies).
3. In **Authentication → Providers → Email**, make sure "Email" is enabled. Magic-link sign-in works out of the box.
4. (Recommended) In **Authentication → URL Configuration**, set the Site URL to your production URL and add `http://localhost:3000` as an additional redirect URL.
5. Copy **Project URL** and **anon public key** from **Settings → API**.

### 2. Run locally

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open http://localhost:3000, enter your email, click the magic link in your inbox.

### 3. Deploy to Vercel

1. Push the repo to GitHub and import it at https://vercel.com/new.
2. Add the two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Deploy, then update Supabase's Site URL to the Vercel domain.

### Lock it to just your account

Anyone with the URL could request a magic link, so after you've signed in once, go to **Authentication → Providers → Email** in Supabase and disable "Enable signups". Existing users keep working; new emails are rejected.

## Project layout

```
app/
  page.tsx               # Today dashboard: hero, glance tiles, sections
  CaloriesCard.tsx       # Calories-vs-target hero card
  AddDisclosure.tsx      # Collapsible "+ Add" wrapper for logging forms
  WaterTracker.tsx       # Optimistic +/- bottle logging (client)
  WeightForm.tsx         # Daily weight upsert (client)
  meals/                 # MealForm with presets, DeleteMealButton
  exercises/             # ExerciseForm with set rows + prefill, delete
  time/                  # Stopwatch: timer bar, start/switch controls, entry editor, manual backfill
  history/               # 90-day charts: calories, water, weight, exercise, time
  demo/                  # Public demo mirrors of Today + History (sample data)
  settings/              # Target calories, macro split, bottle size
  login/                 # Magic-link form + demo entry link
  auth/                  # OAuth callback + signout routes
lib/
  time.ts                # Timezone-aware interval maths (splitByDay) + tests
  timeEntries.ts         # Aggregation over intervals, shared by Today and History
  supabase/              # Browser/server clients + session helper
  demo-data.ts           # Seeded 90-day sample dataset for demo mode
  types.ts               # Row types, kcal math, 1RM estimate, mean/std
supabase/schema.sql      # Tables + RLS policies
middleware.ts            # Session refresh + redirect to /login
```

## Design decisions

- **One page for all daily logging.** The habit loop is "open → log → glance → close"; separate pages per domain would add a navigation tap to every log. Instead, status tiles sit on top and forms stay collapsed until needed.
- **Macros in, calories out.** Storing grams and deriving kcal keeps a single source of truth and makes the macro-split targets exact.
- **Your history is the food database.** No third-party nutrition API — autocomplete is powered by your own past entries, which converges on your real diet fast and works offline from any food DB quirks.
- **Single-user by design.** RLS scopes every row to the signed-in user, and signups can be disabled after first login — a personal tool with real auth, not a demo with none.
- **Demo mode is explicit, not implicit.** Logged-out visitors land on the login page and opt into `/demo`; the demo renders the same page components from an in-memory seeded dataset, so it can never write and never drifts from the real UI.
