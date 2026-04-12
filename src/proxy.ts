import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PATHS = ["/sign-in", "/sign-up"];

// Routes that are accessible without authentication
const PUBLIC_PREFIXES = [
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
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname.startsWith(p));
}

// Clerk sets __session (HttpOnly JWT) for authenticated users.
function hasClerkSession(request: NextRequest): boolean {
  return request.cookies.has("__session");
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const authenticated = hasClerkSession(request);

  if (authenticated && isAuthPath(pathname)) {
    // If a redirect_url was passed, go there; otherwise go to dashboard.
    // Also forward any UTM params on the auth page URL to the destination.
    const redirectTarget = searchParams.get("redirect_url") ?? "/dashboard";
    const destination = new URL(redirectTarget, request.url);

    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("utm_")) {
        destination.searchParams.set(key, value);
      }
    }

    return NextResponse.redirect(destination);
  }

  if (!authenticated && !isPublicPath(pathname)) {
    // Redirect to sign-in; preserve the full original URL as redirect_url
    // and copy UTM params directly onto the sign-in URL for attribution.
    const signIn = new URL("/sign-in", request.url);
    const originalPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    signIn.searchParams.set("redirect_url", originalPath);

    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("utm_")) {
        signIn.searchParams.set(key, value);
      }
    }

    return NextResponse.redirect(signIn);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
