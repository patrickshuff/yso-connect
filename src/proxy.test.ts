import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function makeRequest(path: string, cookieHeader?: string): NextRequest {
  const headers = cookieHeader ? { cookie: cookieHeader } : {};
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("proxy", () => {
  it("does not redirect unauthenticated requests to cron routes", () => {
    const response = proxy(makeRequest("/api/cron/reminders"));
    expect(response).toBeUndefined();
  });

  it("does not redirect unauthenticated requests to analytics routes", () => {
    const response = proxy(makeRequest("/api/analytics/funnel"));
    expect(response).toBeUndefined();
  });

  it("redirects unauthenticated protected routes to sign-in with redirect_url including query params", () => {
    const response = proxy(
      makeRequest(
        "/dashboard/org_1/billing?utm_source=email&utm_medium=trial_reminder&utm_campaign=trial_25d",
      ),
    );

    expect(response).toBeDefined();
    const location = response?.headers.get("location");
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location as string);
    expect(redirectUrl.pathname).toBe("/sign-in");
    expect(redirectUrl.searchParams.get("redirect_url")).toBe(
      "/dashboard/org_1/billing?utm_source=email&utm_medium=trial_reminder&utm_campaign=trial_25d",
    );
  });

  it("redirects authenticated users away from auth pages", () => {
    const response = proxy(makeRequest("/sign-in", "__session=test-token"));
    expect(response).toBeDefined();

    const location = response?.headers.get("location");
    expect(location).toBe("http://localhost/dashboard");
  });
});
