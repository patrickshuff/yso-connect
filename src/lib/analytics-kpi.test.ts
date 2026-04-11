import { describe, expect, it, vi, beforeEach } from "vitest";

// --- hoisted mocks ---

const {
  selectMock,
  whereFunnelMock,
  whereSubmissionsMock,
  funnelEventsTable,
  interestSubmissionsTable,
  state,
} = vi.hoisted(() => {
  const state = {
    interestSubmissionCount: 0,
  };

  const whereFunnelMock = vi.fn(async () => [{ value: 0 }]);
  const fromFunnelMock = vi.fn(() => ({ where: whereFunnelMock }));

  const whereSubmissionsMock = vi.fn(async () => [
    { value: state.interestSubmissionCount },
  ]);
  const fromSubmissionsMock = vi.fn(() => ({ where: whereSubmissionsMock }));

  const funnelEventsTable = { eventName: "eventName", createdAt: "createdAt" };
  const interestSubmissionsTable = {
    utmSource: "utmSource",
    utmMedium: "utmMedium",
    createdAt: "createdAt",
  };

  // Routes select() to the correct from/where mock based on the table argument
  const selectMock = vi.fn(() => ({
    from: (table: unknown) => {
      if (table === funnelEventsTable) return fromFunnelMock();
      return fromSubmissionsMock();
    },
  }));

  return {
    selectMock,
    whereFunnelMock,
    whereSubmissionsMock,
    funnelEventsTable,
    interestSubmissionsTable,
    state,
  };
});

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/db/schema", () => ({
  funnelEvents: funnelEventsTable,
  interestSubmissions: interestSubmissionsTable,
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ and: args }),
  count: () => ({ count: true }),
  eq: (field: unknown, value: unknown) => ({ eq: [field, value] }),
  gte: (field: unknown, value: unknown) => ({ gte: [field, value] }),
  lt: (field: unknown, value: unknown) => ({ lt: [field, value] }),
}));

import {
  getWeeklyKpiMetrics,
  getCurrentLeadChannelBreakdown,
} from "./analytics-kpi";

describe("getWeeklyKpiMetrics", () => {
  beforeEach(() => {
    state.interestSubmissionCount = 0;
    // Each call to whereFunnelMock resolves with value 0 by default
    whereFunnelMock.mockResolvedValue([{ value: 0 }]);
    whereSubmissionsMock.mockResolvedValue([{ value: 0 }]);
  });

  it("returns zeroes when no events exist", async () => {
    const result = await getWeeklyKpiMetrics();

    expect(result.current.landingCtaClicks).toBe(0);
    expect(result.current.signupPageViews).toBe(0);
    expect(result.current.signupSubmissions).toBe(0);
    expect(result.current.orgActivations).toBe(0);
    expect(result.current.leadRecords).toBe(0);
  });

  it("returns previous and current window metrics", async () => {
    const result = await getWeeklyKpiMetrics();

    expect(result).toHaveProperty("current");
    expect(result).toHaveProperty("previous");
    expect(result).toHaveProperty("currentStart");
    expect(result).toHaveProperty("previousStart");
    expect(result).toHaveProperty("currentEnd");
  });

  it("currentStart is 7 days before currentEnd", async () => {
    const result = await getWeeklyKpiMetrics();
    const diffMs = result.currentEnd.getTime() - result.currentStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it("previousStart is 7 days before currentStart", async () => {
    const result = await getWeeklyKpiMetrics();
    const diffMs =
      result.currentStart.getTime() - result.previousStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it("counts funnel events for orgActivations (not organizations table)", async () => {
    // Verify selectMock is called — funnel events table should be queried
    whereFunnelMock.mockResolvedValue([{ value: 5 }]);
    whereSubmissionsMock.mockResolvedValue([{ value: 3 }]);

    await getWeeklyKpiMetrics();

    // 7 funnel event queries per window x 2 windows = 14 calls to whereFunnelMock
    expect(whereFunnelMock).toHaveBeenCalledTimes(14);
    // 1 interestSubmissions query per window x 2 windows = 2 calls
    expect(whereSubmissionsMock).toHaveBeenCalledTimes(2);
  });

  it("handles null/undefined count values from DB", async () => {
    whereFunnelMock.mockResolvedValue([{ value: null }]);
    whereSubmissionsMock.mockResolvedValue([{ value: undefined }]);

    const result = await getWeeklyKpiMetrics();
    expect(result.current.landingCtaClicks).toBe(0);
    expect(result.current.leadRecords).toBe(0);
  });

  it("handles bigint count values from DB", async () => {
    whereFunnelMock.mockResolvedValue([{ value: BigInt(42) }]);
    whereSubmissionsMock.mockResolvedValue([{ value: BigInt(10) }]);

    const result = await getWeeklyKpiMetrics();
    expect(result.current.landingCtaClicks).toBe(42);
    expect(result.current.leadRecords).toBe(10);
  });

  it("handles empty result rows from DB", async () => {
    whereFunnelMock.mockResolvedValue([]);
    whereSubmissionsMock.mockResolvedValue([]);

    const result = await getWeeklyKpiMetrics();
    expect(result.current.landingCtaClicks).toBe(0);
    expect(result.current.leadRecords).toBe(0);
  });
});

describe("getCurrentLeadChannelBreakdown", () => {
  it("returns empty array when no submissions", async () => {
    const fromAllMock = vi.fn(async () => []);
    selectMock.mockReturnValue({ from: () => ({ where: fromAllMock }) });

    const result = await getCurrentLeadChannelBreakdown();
    expect(result).toEqual([]);
  });

  it("aggregates leads by source and medium", async () => {
    const rows = [
      { utmSource: "facebook", utmMedium: "social" },
      { utmSource: "facebook", utmMedium: "social" },
      { utmSource: "google", utmMedium: "cpc" },
      { utmSource: null, utmMedium: null },
    ];
    const fromAllMock = vi.fn(async () => rows);
    selectMock.mockReturnValue({ from: () => ({ where: fromAllMock }) });

    const result = await getCurrentLeadChannelBreakdown();

    const facebook = result.find(
      (r) => r.source === "facebook" && r.medium === "social",
    );
    expect(facebook?.leads).toBe(2);

    const google = result.find(
      (r) => r.source === "google" && r.medium === "cpc",
    );
    expect(google?.leads).toBe(1);

    const direct = result.find(
      (r) => r.source === "direct" && r.medium === "none",
    );
    expect(direct?.leads).toBe(1);
  });

  it("sorts by leads descending", async () => {
    const rows = [
      { utmSource: "a", utmMedium: "x" },
      { utmSource: "b", utmMedium: "y" },
      { utmSource: "b", utmMedium: "y" },
      { utmSource: "b", utmMedium: "y" },
    ];
    const fromAllMock = vi.fn(async () => rows);
    selectMock.mockReturnValue({ from: () => ({ where: fromAllMock }) });

    const result = await getCurrentLeadChannelBreakdown();
    expect(result[0].source).toBe("b");
    expect(result[0].leads).toBe(3);
  });

  it("respects the limit parameter", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      utmSource: `src${i}`,
      utmMedium: "x",
    }));
    const fromAllMock = vi.fn(async () => rows);
    selectMock.mockReturnValue({ from: () => ({ where: fromAllMock }) });

    const result = await getCurrentLeadChannelBreakdown(3);
    expect(result).toHaveLength(3);
  });
});
