import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isPublicPage = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/o/(.*)",
  "/privacy",
  "/terms",
  "/consent",
  "/api/webhooks/(.*)",
  "/api/health",
  "/api/cron/(.*)",
  "/api/analytics/(.*)",
  "/sitemap.xml",
  "/icon.svg",
  "/favicon.ico",
]);

// clerkMiddleware must run on every request so that auth() works in Server
// Components. We do NOT rely on its userId for the sign-in redirect because
// Clerk intentionally returns null on auth pages even for signed-in users.
const clerkHandler = clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Protect non-public pages for unauthenticated users
  if (!userId && !isPublicPage(request)) {
    const signIn = new URL("/sign-in", request.url);
    const { pathname, searchParams } = request.nextUrl;
    const originalPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    signIn.searchParams.set("redirect_url", originalPath);
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("utm_")) signIn.searchParams.set(key, value);
    }
    return NextResponse.redirect(signIn);
  }
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname, searchParams } = request.nextUrl;

  // Fast-path: redirect signed-in users away from auth pages using the
  // __session cookie. Clerk's auth() returns null on auth pages even for
  // signed-in users, so we use the cookie directly for this redirect.
  if (request.cookies.has("__session") && isAuthPage(request)) {
    const redirectTarget = searchParams.get("redirect_url") ?? "/dashboard";
    const destination = new URL(redirectTarget, request.url);
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("utm_")) destination.searchParams.set(key, value);
    }
    return NextResponse.redirect(destination);
  }

  // clerkMiddleware runs for all other requests (sets up auth context)
  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
