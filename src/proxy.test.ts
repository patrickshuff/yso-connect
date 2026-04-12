import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";

// Mock clerkMiddleware so tests don't need a live Clerk backend.
// The mock delegates to the handler with userId: null (unauthenticated),
// sufficient to test route-protection redirect logic.
// Auth-page redirects use the cookie fast-path and never reach clerkMiddleware.
vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    clerkMiddleware: (
      handler: (
        auth: () => Promise<{ userId: null }>,
        request: NextRequest,
      ) => Promise<NextResponse | undefined>,
    ) =>
      async (request: NextRequest, _event: NextFetchEvent) =>
        handler(async () => ({ userId: null }), request),
  };
});

// proxy must be imported AFTER the mock is registered
import { proxy } from "./proxy";

function makeRequest(path: string, cookieHeader?: string): NextRequest {
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("proxy", () => {
  it("does not redirect unauthenticated requests to cron routes", async () => {
    const response = await proxy(makeRequest("/api/cron/reminders"));
    expect(response).toBeUndefined();
  });

  it("does not redirect unauthenticated requests to trial reminder cron routes", async () => {
    const response = await proxy(makeRequest("/api/cron/trial-reminders"));
    expect(response).toBeUndefined();
  });

  it("does not redirect unauthenticated requests to analytics routes", async () => {
    const response = await proxy(makeRequest("/api/analytics/funnel"));
    expect(response).toBeUndefined();
  });

  it("redirects unauthenticated protected routes to sign-in with redirect_url and UTM params", async () => {
    const response = (await proxy(
      makeRequest(
        "/dashboard/org_1/billing?utm_source=email&utm_medium=trial_reminder&utm_campaign=trial_25d",
      )
    )) as NextResponse;

    expect(response).toBeDefined();
    const location = response?.headers.get("location");
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location as string);
    expect(redirectUrl.pathname).toBe("/sign-in");

    // Check redirect_url contains full original path and params
    expect(redirectUrl.searchParams.get("redirect_url")).toBe(
      "/dashboard/org_1/billing?utm_source=email&utm_medium=trial_reminder&utm_campaign=trial_25d",
    );

    // Check UTM params are ALSO on the sign-in URL itself
    expect(redirectUrl.searchParams.get("utm_source")).toBe("email");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("trial_reminder");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("trial_25d");
  });

  it("does not copy non-utm params onto sign-in URL during unauthenticated redirect", async () => {
    const response = (await proxy(
      makeRequest(
        "/dashboard/org_1/billing?utm_source=email&utm_medium=trial_reminder&coupon=free_week",
      )
    )) as NextResponse;

    expect(response).toBeDefined();
    const location = response?.headers.get("location");
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location as string);
    expect(redirectUrl.pathname).toBe("/sign-in");
    expect(redirectUrl.searchParams.get("redirect_url")).toBe(
      "/dashboard/org_1/billing?utm_source=email&utm_medium=trial_reminder&coupon=free_week",
    );
    expect(redirectUrl.searchParams.get("utm_source")).toBe("email");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("trial_reminder");
    expect(redirectUrl.searchParams.get("coupon")).toBeNull();
  });

  it("redirects authenticated users away from auth pages to dashboard by default", async () => {
    const response = (await proxy(makeRequest("/sign-in", "__session=test-token"))) as NextResponse;
    expect(response).toBeDefined();

    const location = response?.headers.get("location");
    expect(location).toBe("http://localhost/dashboard");
  });

  it("redirects authenticated users away from auth pages to redirect_url if present", async () => {
    const response = (await proxy(
      makeRequest("/sign-in?redirect_url=/dashboard/org_1/settings", "__session=test-token")
    )) as NextResponse;
    expect(response).toBeDefined();

    const location = response?.headers.get("location");
    expect(location).toBe("http://localhost/dashboard/org_1/settings");
  });

  it("preserves UTM params when redirecting authenticated users away from auth pages", async () => {
    const response = (await proxy(
      makeRequest("/sign-in?utm_source=ad&utm_medium=cpc", "__session=test-token")
    )) as NextResponse;
    expect(response).toBeDefined();

    const location = response?.headers.get("location");
    const url = new URL(location as string);
    expect(url.pathname).toBe("/dashboard");
    expect(url.searchParams.get("utm_source")).toBe("ad");
    expect(url.searchParams.get("utm_medium")).toBe("cpc");
  });
});
