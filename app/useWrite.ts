"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export const DEMO_MESSAGE = "Saving is disabled in the demo — sign in to track your own.";

type WriteContext = { supabase: SupabaseClient; userId: string };
// Supabase query builders resolve to { error, ... }; plain awaits resolve to void.
type WriteResult = { error: { message: string } | null } | void;

/**
 * Single guarded write path for every mutating component.
 *
 * The bug this exists to prevent: gating a submit button on `useTransition`'s
 * `pending` leaves the button live for the whole network round trip, because
 * `startTransition` only runs *after* the write resolves. On a slow phone
 * connection that's a second or more of enabled button, and one impatient tap
 * inserts the row twice.
 *
 * The guard is a ref flipped synchronously before the first await — state
 * updates are batched, so a second tap in the same frame would still observe
 * the old value.
 */
export function useWrite() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (fn: (ctx: WriteContext) => PromiseLike<WriteResult>): Promise<boolean> => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setSaving(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setError(DEMO_MESSAGE);
          return false;
        }
        const result = await fn({ supabase, userId: data.user.id });
        if (result && result.error) {
          setError(result.error.message);
          return false;
        }
        startTransition(() => router.refresh());
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
        return false;
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    },
    [router],
  );

  return { run, busy: saving || refreshing, error, setError };
}

/**
 * Client-generated primary key for insert-only tables.
 *
 * Meals and exercises have no natural key — two identical meals in a day are
 * legitimate — so the database cannot tell a duplicate from a real second
 * entry. Sending the id with the insert means a request replayed by the
 * browser or a flaky radio collides on the PK instead of creating a twin.
 */
export function newId() {
  return crypto.randomUUID();
}
