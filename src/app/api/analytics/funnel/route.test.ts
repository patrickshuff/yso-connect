import { describe, expect, it, vi } from "vitest";

const { insertValuesMock, insertMock, funnelEventsTable } = vi.hoisted(() => {
  const insertValuesMock = vi.fn(async () => []);
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));
  const funnelEventsTable = {};
  return { insertValuesMock, insertMock, funnelEventsTable };
});

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
  },
}));

vi.mock("@/db/schema", () => ({
  funnelEvents: funnelEventsTable,
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/analytics/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/funnel", () => {
  it("accepts valid telemetry without authentication headers", async () => {
    const res = await POST(makeRequest({ eventName: "funnel_landing_cta_click" }));
    expect(res.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "funnel_landing_cta_click" }),
    );
  });

  it("accepts a valid funnel_landing_cta_click event", async () => {
    const res = await POST(makeRequest({ eventName: "funnel_landing_cta_click" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith(funnelEventsTable);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "funnel_landing_cta_click" }),
    );
  });

  it("accepts funnel_signup_page_view", async () => {
    const res = await POST(makeRequest({ eventName: "funnel_signup_page_view" }));
    expect(res.status).toBe(200);
  });

  it("accepts funnel_signup_submitted", async () => {
    const res = await POST(makeRequest({ eventName: "funnel_signup_submitted" }));
    expect(res.status).toBe(200);
  });

  it("accepts funnel_org_activation", async () => {
    const res = await POST(makeRequest({ eventName: "funnel_org_activation" }));
    expect(res.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "funnel_org_activation" }),
    );
  });

  it("rejects an unknown event name", async () => {
    const res = await POST(makeRequest({ eventName: "funnel_unknown_event" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid event name" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a missing event name", async () => {
    const res = await POST(makeRequest({ organizationId: "org-123" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const req = new Request("http://localhost/api/analytics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid JSON body" });
  });

  it("stores optional UTM and context fields", async () => {
    const payload = {
      eventName: "funnel_landing_cta_click",
      organizationId: "org-123",
      organizationSlug: "my-org",
      location: "hero",
      pagePath: "/",
      utmSource: "facebook",
      utmMedium: "social",
      utmCampaign: "spring",
      utmTerm: "youth sports",
      utmContent: "banner",
      referrer: "https://facebook.com",
    };

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "funnel_landing_cta_click",
        organizationId: "org-123",
        utmSource: "facebook",
        utmCampaign: "spring",
        referrer: "https://facebook.com",
      }),
    );
  });

  it("sanitizes field values exceeding max length", async () => {
    const longValue = "x".repeat(600);
    const res = await POST(
      makeRequest({
        eventName: "funnel_landing_cta_click",
        utmSource: longValue,
      }),
    );
    expect(res.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ utmSource: null }),
    );
  });

  it("sanitizes non-string field values to null", async () => {
    const res = await POST(
      makeRequest({
        eventName: "funnel_landing_cta_click",
        utmSource: 12345,
        utmMedium: true,
      }),
    );
    expect(res.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ utmSource: null, utmMedium: null }),
    );
  });
});
