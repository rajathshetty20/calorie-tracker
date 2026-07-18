import { Plus } from "lucide-react";

// Native <details> keeps logging forms collapsed until needed while the form
// stays mounted (typed input survives closing) and the label stays the
// toggle's accessible name — no client JS required.
export default function AddDisclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 select-none hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300 [&::-webkit-details-marker]:hidden">
        <Plus className="h-4 w-4 transition-transform group-open:rotate-45" />
        {label}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
