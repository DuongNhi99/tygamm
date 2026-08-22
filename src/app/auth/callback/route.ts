import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Lands the user after they click an emailed link.
 *
 * Supabase sends either a PKCE `code` or a `token_hash` + `type` pair
 * depending on the project's email template, so both are handled here.
 * Either way the exchange happens server-side and the session cookie is set
 * on this response.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // A misconfigured deployment should land on the login page's setup notice,
  // not a 500 from the middle of an auth flow.
  if (!isSupabaseConfigured) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "email" | "invite" | "magiclink",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
