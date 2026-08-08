"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import Nav from "./Nav";

// Top chrome for the app pages; the login screen stands alone.
export default function TopBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;
  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Logo className="h-6 w-6 shrink-0" />
        {/* Tabs move to the bottom bar on phones; the thumb lives there. */}
        <div className="hidden md:block">
          <Nav />
        </div>
        <span className="md:hidden text-[0.9375rem] font-semibold">Daily Tracker</span>
        {/* No Add here: it lives beside the date strip on desktop, next to
            the day it writes to, and in the bottom bar on phones. Two solid
            buttons in this corner competed, and the accent green reads as
            "a timer is running" elsewhere in the app. */}
        {signedIn ? (
          <form action="/auth/signout" method="post" className="ml-auto">
            <button type="submit"
 className="text-[0.8125rem] text-ink-3 hover:text-ink" >
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/login"
 className="ml-auto whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-[0.8125rem] font-semibold text-ground" >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
