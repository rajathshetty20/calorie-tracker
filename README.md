# Calorie tracker

A small Next.js + Supabase app to log meals (carbs / protein / fat), track daily calorie totals against a target, and chart weight over time.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth via magic link)
- Recharts for the weight graph
- Hosted on Vercel

## 1. Set up Supabase

1. Create a project at https://supabase.com (free tier is fine).
2. In **SQL Editor**, paste and run `supabase/schema.sql`.
3. In **Authentication → Providers → Email**, make sure "Email" is enabled. Magic-link sign-in works out of the box.
4. (Recommended) In **Authentication → URL Configuration**, set the Site URL to your Vercel URL and add `http://localhost:3000` as an additional redirect URL.
5. Copy **Project URL** and **anon public key** from **Settings → API**.

## 2. Run locally

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open http://localhost:3000, enter your email, click the magic link in your inbox.

## 3. Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Add the two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. Once live, update Supabase's Site URL to the Vercel domain.

## Lock it to just your account

Because anyone with the URL could request a magic link, restrict signups:

- In Supabase, go to **Authentication → Providers → Email** and disable "Enable signups" *after* you've signed in once. Existing users keep working; new emails are rejected.

## Project layout

```
app/
  page.tsx               # Today's meals + macro progress
  meals/                 # MealForm, DeleteMealButton (client)
  weight/                # Weight log + Recharts graph
  settings/              # Target calories + macro split
  login/                 # Magic-link form
  auth/callback/         # OAuth code exchange
  auth/signout/          # POST signout
lib/
  supabase/{client,server,middleware}.ts
  types.ts               # Meal / Weight / Settings types + kcal math
supabase/schema.sql      # Tables + RLS policies
middleware.ts            # Session refresh + redirect to /login
```
