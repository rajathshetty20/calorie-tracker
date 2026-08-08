import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes a sign-in from an emailed link.
 *
 * Two shapes arrive here:
 *
 *  - `?code=…` — the PKCE flow the browser client uses by default. It needs
 *    the code_verifier cookie stored by the browser that REQUESTED the link,
 *    so it only works if the link is opened in that same browser. Tapping the
 *    link inside a mail app opens that app's in-app browser, where the
 *    verifier does not exist and the exchange always fails.
 *
 *  - `?token_hash=…&type=…` — verified server-side with no verifier, so it
 *    works from any browser. Point the email template at this to make links
 *    portable across devices.
 *
 * Failures used to be swallowed and redirected to "/", which the proxy then
 * bounced to /login — indistinguishable from never having clicked at all.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  const fail = (reason: string) => {
    const to = new URL("/login", url.origin);
    to.searchParams.set("error", reason);
    return NextResponse.redirect(to);
  };

  const supabase = await createClient();

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: (type as "magiclink" | "email" | "recovery" | "invite") ?? "email",
      token_hash: tokenHash,
    });
    if (error) return fail(error.message);
    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(error.message);
    return NextResponse.redirect(new URL(next, url.origin));
  }

  return fail("That link was missing its sign-in token.");
}
