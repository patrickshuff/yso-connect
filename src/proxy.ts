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
  "/sitemap.xml",
  "/icon.svg",
  "/favicon.ico",
]);

const clerkHandler = clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Redirect signed-in users away from auth pages
  if (userId && isAuthPage(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protect all non-public pages
  if (!userId && !isPublicPage(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
