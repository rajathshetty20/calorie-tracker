"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "../Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Mail providers scan links, and a scan spends a single-use magic link
  // before you ever click it. The emailed 6-digit code is not a URL, so
  // nothing can consume it on your behalf.
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setVerifying(false);
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    window.location.assign("/");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 p-6">
      <form
        onSubmit={onSubmit}
 className="w-full max-w-sm space-y-4 rounded-xl border border-rule bg-surface p-6 shadow-sm" >
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9 shrink-0" />
          <div>
            <h1 className="text-xl font-semibold">Daily tracker</h1>
            <p className="text-[0.8125rem] text-ink-3">Sign in with a magic link.</p>
          </div>
        </div>
        <input type="email"
          required placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
 className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] outline-none focus:border-ink " />
        <button type="submit"
          disabled={status === "sending"}
 className="w-full rounded-lg bg-ink px-3 py-2 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40" >
          {status === "sending" ? "Sending..." : "Send link"}
        </button>
        {status === "sent" && (
          <div className="space-y-2 rounded-lg border border-rule p-3">
            <p className="text-[0.8125rem] text-emerald-600">
              Check your inbox. Open the link, or enter the code from the same email.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="min-w-0 flex-1 rounded-lg border border-rule bg-surface px-3 py-2 tabular-nums outline-none focus:border-ink"
              />
              <button
                type="button"
                onClick={(e) => onVerify(e as unknown as React.FormEvent<HTMLFormElement>)}
                disabled={verifying || code.length < 6}
                className="shrink-0 rounded-lg bg-ink px-3 py-2 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40"
              >
                {verifying ? "…" : "Sign in"}
              </button>
            </div>
          </div>
        )}
        {status === "error" && error && (
          <p className="text-[0.8125rem] text-over">{error}</p>
        )}
        <p className="border-t border-rule pt-4 text-center text-[0.8125rem] text-ink-3">
          Just looking?{" "}
          <Link href="/demo"
 className="font-medium text-ink underline underline-offset-2 hover:text-ink-2" >
            Browse the demo
          </Link>
        </p>
      </form>
    </div>
  );
}
