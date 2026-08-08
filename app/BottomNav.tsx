"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutDashboard, Plus, Settings, type LucideIcon } from "lucide-react";
import { useAddSheet } from "./AddSheet";

// Inside /demo the same tabs point at the demo mirrors.
const LEFT: { base: string; demo: string; label: string; icon: LucideIcon }[] = [
  { base: "/", demo: "/demo", label: "Today", icon: LayoutDashboard },
  { base: "/history", demo: "/demo/history", label: "History", icon: History },
];
const RIGHT: { base: string; demo: string; label: string; icon: LucideIcon }[] = [
  { base: "/settings", demo: "/demo/settings", label: "Settings", icon: Settings },
];

/**
 * Primary navigation lives at the bottom because this is a phone app first:
 * the thumb is down there and the notch is up top. The centre control opens
 * the quick-add sheet, which is the single most-used action in the app.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { open } = useAddSheet();

  if (pathname.startsWith("/login")) return null;
  const inDemo = pathname === "/demo" || pathname.startsWith("/demo/");

  return (
    <nav aria-label="Primary"
 className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" >
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2">
          {LEFT.map((l) => (
            <Tab key={l.base} {...l} inDemo={inDemo} pathname={pathname} />
          ))}

          <div className="flex shrink-0 items-center px-1">
            <button type="button"
              onClick={open} aria-label="Add an entry"
 className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-ground shadow-lg transition-transform active:scale-95 dark:text-[#08251c]" >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {RIGHT.map((l) => (
            <Tab key={l.base} {...l} inDemo={inDemo} pathname={pathname} />
          ))}
      </div>
    </nav>
  );
}

function Tab({
  base,
  demo,
  label,
  icon: Icon,
  inDemo,
  pathname,
}: {
  base: string;
  demo: string;
  label: string;
  icon: LucideIcon;
  inDemo: boolean;
  pathname: string;
}) {
  const href = inDemo ? demo : base;
  const active =
    href === "/" || href === "/demo" ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
 className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium transition-colors ${
        active ? "text-ink" : "text-ink-3 hover:text-ink-2"
      }`} >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
      {label}
    </Link>
  );
}
