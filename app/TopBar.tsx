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
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Logo className="h-6 w-6 shrink-0" />
        <Nav />
        {signedIn ? (
          <form action="/auth/signout" method="post" className="ml-auto">
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="ml-auto whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
