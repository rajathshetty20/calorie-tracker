import Link from "next/link";

// Amber on purpose — it breaks the app's zinc/emerald palette so the mode
// reads as a mode, not content.
export default function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
      <p className="text-[0.8125rem] text-amber-900 dark:text-amber-200">
        <span className="font-semibold">Demo mode.</span> Sample data — explore everything;
        saving is disabled.
      </p>
      <Link href="/login"
 className="rounded-lg bg-ink px-3 py-1.5 text-[0.8125rem] font-medium text-ground hover:bg-zinc-800" >
        Sign in to track your own
      </Link>
    </div>
  );
}
