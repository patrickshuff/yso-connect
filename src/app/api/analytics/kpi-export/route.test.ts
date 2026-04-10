import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  authMock,
  getUserOrganizationsMock,
  getWeeklyKpiMetricsMock,
  getCurrentLeadChannelBreakdownMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getUserOrganizationsMock: vi.fn(),
  getWeeklyKpiMetricsMock: vi.fn(),
  getCurrentLeadChannelBreakdownMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/memberships", () => ({
  getUserOrganizations: getUserOrganizationsMock,
}));

vi.mock("@/lib/analytics-kpi", () => ({
  getWeeklyKpiMetrics: getWeeklyKpiMetricsMock,
  getCurrentLeadChannelBreakdown: getCurrentLeadChannelBreakdownMock,
}));

import { GET } from "./route";

describe("GET /api/analytics/kpi-export", () => {
  beforeEach(() => {
    authMock.mockReset();
    getUserOrganizationsMock.mockReset();
    getWeeklyKpiMetricsMock.mockReset();
    getCurrentLeadChannelBreakdownMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns 403 when user is not an owner", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    getUserOrganizationsMock.mockResolvedValue([{ role: "admin" }]);

    const res = await GET();

    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Forbidden");
  });

  it("returns csv for owners", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    getUserOrganizationsMock.mockResolvedValue([{ role: "owner" }]);
    getWeeklyKpiMetricsMock.mockResolvedValue({
      current: {
        landingCtaClicks: 10,
        signupPageViews: 8,
        signupSubmissions: 4,
        orgActivations: 2,
        leadRecords: 6,
      },
      previous: {
        landingCtaClicks: 5,
        signupPageViews: 4,
        signupSubmissions: 2,
        orgActivations: 1,
        leadRecords: 3,
      },
    });
    getCurrentLeadChannelBreakdownMock.mockResolvedValue([
      { source: "facebook", medium: "social", leads: 3 },
    ]);

    const res = await GET();
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="weekly-kpi-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(body).toContain("funnel,landing_cta_clicks,10,5");
    expect(body).toContain("attribution,facebook,social,3");
    expect(getCurrentLeadChannelBreakdownMock).toHaveBeenCalledWith(100);
  });
});
