import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PATHS = ["/sign-in", "/sign-up"];

const PUBLIC_PREFIXES = [
  "/",
  "/o",
  "/privacy",
  "/terms",
  "/consent",
  "/api/webhooks",
  "/api/health",
  "/api/cron",
  "/api/analytics",
  "/sitemap.xml",
  "/icon.svg",
  "/favicon.ico",
  "/sign-in",
  "/sign-up",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.slice(1).some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
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
    const redirectUrlParam = request.nextUrl.searchParams.get("redirect_url");
    let targetUrl: URL;

    if (redirectUrlParam) {
      try {
        targetUrl = new URL(redirectUrlParam, request.url);
      } catch {
        targetUrl = new URL("/dashboard", request.url);
      }
    } else {
      targetUrl = new URL("/dashboard", request.url);
    }

    // Preserve ALL search params (UTM, etc.) on the redirect target
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== "redirect_url") {
        targetUrl.searchParams.set(key, value);
      }
    });

    return NextResponse.redirect(targetUrl);
  }

  // Block unauthenticated access to protected routes
  if (!authenticated && !isPublicPath(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserving the full original URL including search params for attribution
    const redirectUrl = `${pathname}${search}`;
    signInUrl.searchParams.set("redirect_url", redirectUrl);

    // Also copy all UTM parameters from the original request directly onto the
    // /sign-in URL so the sign-in page can track them for attribution.
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key.startsWith("utm_")) {
        signInUrl.searchParams.set(key, value);
      }
    });

    return NextResponse.redirect(signInUrl);
  }
}

export default middleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
