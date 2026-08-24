import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  matchLocale,
} from "@/lib/i18n/config";
import type { Database } from "@/types/database";

/** Reachable without a session. Everything else needs one. */
const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/join", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Gives a first-time visitor the closest language we have before anything
 * renders, so the login page is already in their language rather than
 * flipping to it once they find the picker in Settings.
 *
 * The cookie is written onto the request straight away, so this very render
 * reads it, and returned as a stamp to put on whichever response wins. An
 * existing cookie is never overwritten — an explicit choice outranks the
 * browser's header.
 */
function ensureLocaleCookie(request: NextRequest): ((response: NextResponse) => void) | null {
  if (isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) return null;

  const locale = matchLocale(request.headers.get("accept-language"));
  request.cookies.set(LOCALE_COOKIE, locale);

  return (response) => {
    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
  };
}

/**
 * Refreshes the auth token on every request and applies a coarse redirect for
 * signed-out visitors.
 *
 * This is an optimistic check only — it keeps signed-out users off dashboard
 * URLs, but it is not the authorization boundary. Role enforcement lives in
 * the dashboard layout (`requireRole`) and, decisively, in the RLS policies.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Decided before anything else so the locale rides along even on the two
  // redirects below, which never reach the bottom of this function.
  const stampLocale = ensureLocaleCookie(request);
  const finish = (response: NextResponse) => {
    stampLocale?.(response);
    return response;
  };

  // Without credentials there is no session to refresh; let the page render
  // and show its own setup message instead of redirect-looping.
  if (!isSupabaseConfigured) {
    return finish(NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Rebuild the response so refreshed tokens ride along with it.
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates the token with Supabase. getSession() would only
  // read the cookie, which a client can forge.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Bounce the visitor back where they were headed after signing in.
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    }
    return finish(NextResponse.redirect(loginUrl));
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return finish(NextResponse.redirect(dashboardUrl));
  }

  return finish(supabaseResponse);
}
