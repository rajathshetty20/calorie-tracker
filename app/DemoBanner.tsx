import Link from "next/link";

// Amber on purpose — it breaks the app's zinc/emerald palette so the mode
// reads as a mode, not content.
export default function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
      <p className="text-sm text-amber-900 dark:text-amber-200">
        <span className="font-semibold">Demo mode.</span> You&apos;re browsing sample data —
        nothing here is saved.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Sign in to track your own
      </Link>
    </div>
  );
}
