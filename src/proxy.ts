import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

// clerkMiddleware MUST run on every request so that auth() works in Server
// Components. We do NOT do route-protection redirects here — the pages
// themselves handle unauthenticated access — because a mismatch between
// the __session cookie and Clerk's server-side validation (e.g. when
// Organizations are enabled) causes an ERR_TOO_MANY_REDIRECTS loop.
const clerkHandler = clerkMiddleware(async (_auth, _request) => {
  // intentionally empty — just sets up auth context for auth() calls
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { searchParams } = request.nextUrl;

  // Redirect signed-in users away from auth pages via __session cookie.
  // We use the cookie rather than auth() because Clerk returns userId = null
  // on auth pages even for signed-in users.
  if (request.cookies.has("__session") && isAuthPage(request)) {
    const redirectTarget = searchParams.get("redirect_url") ?? "/dashboard";
    const destination = new URL(redirectTarget, request.url);
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("utm_")) destination.searchParams.set(key, value);
    }
    return NextResponse.redirect(destination);
  }

  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
