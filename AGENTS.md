<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Demo mode must stay in sync

`/demo` (plus `/demo/history`, `/demo/settings`) renders the *real* page components with an in-memory sample dataset from `lib/demo-data.ts` — there are no demo rows in the database. When you change what the app tracks or shows, update the demo in the same change:

- New or changed table/column (`supabase/schema.sql`, `lib/types.ts`) → extend the generator in `lib/demo-data.ts` so the field is populated with plausible values.
- New tracked domain or page → add its sample data, a demo branch in the page's no-session path, and a `/demo/...` mirror route.
- Keep the generator deterministic: it uses a fixed-seed PRNG and dates relative to today — never `Math.random()` or varying seeds, so every visitor sees identical data.
- Writes are blocked by the missing session: any new write component must check `supabase.auth.getUser()` before writing and show the inline "Saving is disabled in the demo — sign in to track your own." message (see `MealForm.tsx` for the pattern).

A quick check after UI changes: load `/demo` logged-out and confirm the new feature shows populated sample data.
<!-- END:nextjs-agent-rules -->
