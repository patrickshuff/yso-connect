import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";

// Mock clerkMiddleware — the proxy uses it only for auth() context setup,
// not for any redirect logic. The mock is a no-op pass-through.
vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    clerkMiddleware: (
      _handler: (
        auth: () => Promise<{ userId: null }>,
        request: NextRequest,
      ) => Promise<NextResponse | undefined>,
    ) =>
      async (_request: NextRequest, _event: NextFetchEvent) =>
        undefined, // no-op: just sets up Clerk auth context
  };
});

// proxy must be imported AFTER the mock is registered
import { proxy } from "./proxy";

const mockEvent = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as NextFetchEvent;

function makeRequest(path: string, cookieHeader?: string): NextRequest {
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("proxy", () => {
  // Route protection is handled by the pages themselves to avoid redirect
  // loops. The proxy should let all unauthenticated requests through.
  it("does not redirect unauthenticated requests to protected routes", async () => {
    const response = await proxy(makeRequest("/dashboard/org_1/billing"), mockEvent);
    expect(response).toBeUndefined();
  });

  it("does not redirect unauthenticated requests to cron routes", async () => {
    const response = await proxy(makeRequest("/api/cron/reminders"), mockEvent);
    expect(response).toBeUndefined();
  });

  it("does not redirect unauthenticated requests to analytics routes", async () => {
    const response = await proxy(makeRequest("/api/analytics/funnel"), mockEvent);
    expect(response).toBeUndefined();
  });

  // Authenticated users hitting auth pages are redirected away via cookie.
  it("redirects authenticated users away from /sign-in to dashboard by default", async () => {
    const response = (await proxy(
      makeRequest("/sign-in", "__session=test-token"),
      mockEvent,
    )) as NextResponse;
    expect(response).toBeDefined();
    const location = response?.headers.get("location");
    expect(location).toBe("http://localhost/dashboard");
  });

  it("redirects authenticated users to redirect_url when present on /sign-in", async () => {
    const response = (await proxy(
      makeRequest("/sign-in?redirect_url=/dashboard/org_1/settings", "__session=test-token"),
      mockEvent,
    )) as NextResponse;
    expect(response).toBeDefined();
    const location = response?.headers.get("location");
    expect(location).toBe("http://localhost/dashboard/org_1/settings");
  });

  it("preserves UTM params when redirecting authenticated users away from auth pages", async () => {
    const response = (await proxy(
      makeRequest("/sign-in?utm_source=ad&utm_medium=cpc", "__session=test-token"),
      mockEvent,
    )) as NextResponse;
    expect(response).toBeDefined();
    const url = new URL(response?.headers.get("location") as string);
    expect(url.pathname).toBe("/dashboard");
    expect(url.searchParams.get("utm_source")).toBe("ad");
    expect(url.searchParams.get("utm_medium")).toBe("cpc");
  });

  it("redirects authenticated users away from /sign-up to dashboard", async () => {
    const response = (await proxy(
      makeRequest("/sign-up", "__session=test-token"),
      mockEvent,
    )) as NextResponse;
    expect(response).toBeDefined();
    const location = response?.headers.get("location");
    expect(location).toBe("http://localhost/dashboard");
  });

  it("does not redirect unauthenticated users on /sign-in", async () => {
    const response = await proxy(makeRequest("/sign-in"), mockEvent);
    expect(response).toBeUndefined();
  });
});
