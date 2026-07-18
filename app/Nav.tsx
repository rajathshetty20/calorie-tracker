"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  History,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

// Inside /demo the same tabs point at the demo mirrors.
const links: { base: string; demo: string; label: string; icon: LucideIcon }[] = [
  { base: "/", demo: "/demo", label: "Today", icon: LayoutDashboard },
  { base: "/history", demo: "/demo/history", label: "History", icon: History },
  { base: "/settings", demo: "/demo/settings", label: "Settings", icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  const inDemo = pathname === "/demo" || pathname.startsWith("/demo/");
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
      {inDemo && (
        <span className="mr-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Demo
        </span>
      )}
      {links.map(({ base, demo, label, icon: Icon }) => {
        const href = inDemo ? demo : base;
        const isActive =
          href === "/" || href === "/demo"
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            key={base}
            href={href}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 transition-colors ${
              isActive
                ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
