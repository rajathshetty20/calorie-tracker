import Link from "next/link";
import { LogIn } from "lucide-react";

// Demo-mode stand-in for AddDisclosure: same dashed shape, but the action
// is signing in — every write affordance points at the login page.
export default function SignInPrompt({ label }: { label: string }) {
  return (
    <Link
      href="/login"
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
    >
      <LogIn className="h-4 w-4" />
      {label}
    </Link>
  );
}
