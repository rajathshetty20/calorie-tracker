"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/types";

export default function WeightForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(todayISO());
  const [kg, setKg] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Not signed in");
      return;
    }
    const { error } = await supabase
      .from("weights")
      .upsert(
        {
          user_id: userData.user.id,
          measured_on: date,
          weight_kg: Number(kg),
        },
        { onConflict: "user_id,measured_on" },
      );
    if (error) {
      setError(error.message);
      return;
    }
    setKg("");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <label className="block">
        <span className="text-xs text-zinc-500">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
        />
      </label>
      <label className="block">
        <span className="text-xs text-zinc-500">Weight (kg)</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          required
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder="0.0"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Saving..." : "Save"}
      </button>
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
