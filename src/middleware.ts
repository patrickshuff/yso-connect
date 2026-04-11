import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PATHS = ["/sign-in", "/sign-up"];

const PUBLIC_PREFIXES = [
  "/",
  "/o/",
  "/privacy",
  "/terms",
  "/consent",
  "/api/webhooks/",
  "/api/health",
  "/api/cron/",
  "/api/analytics/",
  "/sitemap.xml",
  "/icon.svg",
  "/favicon.ico",
  "/sign-in",
  "/sign-up",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.slice(1).some((p) => pathname.startsWith(p));
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname.startsWith(p));
}

// Clerk sets __session (HttpOnly JWT) when a user has an active session.
// Reading the cookie presence is enough for redirect logic — the pages
// themselves enforce proper token validation.
function hasClerkSession(request: NextRequest): boolean {
  return request.cookies.has("__session");
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authenticated = hasClerkSession(request);

  // Send signed-in users away from auth pages immediately
  if (authenticated && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Block unauthenticated access to protected routes
  if (!authenticated && !isPublicPath(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserving the full original URL including search params for attribution
    const redirectUrl = `${pathname}${search}`;
    signInUrl.searchParams.set("redirect_url", redirectUrl);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
