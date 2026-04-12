import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUpcomingRemindersMock, processReminderMock, withCronSafetyMock, loggerErrorMock, loggerInfoMock } =
  vi.hoisted(() => {
    const getUpcomingRemindersMock = vi.fn();
    const processReminderMock = vi.fn();
    const withCronSafetyMock = vi.fn();
    const loggerErrorMock = vi.fn();
    const loggerInfoMock = vi.fn();
    return {
      getUpcomingRemindersMock,
      processReminderMock,
      withCronSafetyMock,
      loggerErrorMock,
      loggerInfoMock,
    };
  });

vi.mock("@/lib/reminders", () => ({
  getUpcomingReminders: getUpcomingRemindersMock,
  processReminder: processReminderMock,
}));

vi.mock("@/lib/cron-safety", () => ({
  withCronSafety: withCronSafetyMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: loggerErrorMock,
    info: loggerInfoMock,
  },
}));

import { GET } from "./route";

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return new NextRequest("http://localhost/api/cron/reminders", { headers });
}

describe("GET /api/cron/reminders", () => {
  const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set a known secret by default; individual tests override as needed.
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    if (ORIGINAL_CRON_SECRET === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
    }
  });

  it("returns 500 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(makeRequest("Bearer anything"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "CRON_SECRET environment variable is not set",
    );
    expect(withCronSafetyMock).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is set but no authorization header is provided", async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(withCronSafetyMock).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization header has wrong secret", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(withCronSafetyMock).not.toHaveBeenCalled();
  });

  it("returns 200 with run data when auth is valid and cron completes normally", async () => {
    withCronSafetyMock.mockResolvedValueOnce({
      runId: "run-abc-123",
      status: "completed",
      itemsFound: 3,
      itemsProcessed: 3,
      itemsFailed: 0,
      durationMs: 42,
    });

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      runId: "run-abc-123",
      status: "completed",
      found: 3,
      processed: 3,
      failed: 0,
      durationMs: 42,
    });
    expect(withCronSafetyMock).toHaveBeenCalledWith("reminders", expect.any(Function));
  });

  it("returns 200 with skipped status when withCronSafety returns skipped", async () => {
    withCronSafetyMock.mockResolvedValueOnce({
      runId: "run-xyz-456",
      status: "skipped",
      itemsFound: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      durationMs: 1,
    });

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      status: "skipped",
      reason: "concurrent execution",
    });
    expect(withCronSafetyMock).toHaveBeenCalledWith("reminders", expect.any(Function));
  });

  it("executes reminder pipeline and reports processing failures", async () => {
    getUpcomingRemindersMock.mockResolvedValueOnce([
      { reminder: { id: "rem-1" }, event: { id: "event-1" } },
      { reminder: { id: "rem-2" }, event: { id: "event-2" } },
      { reminder: { id: "rem-3" }, event: { id: "event-3" } },
    ]);
    processReminderMock
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error("sms delivery failed"))
      .mockResolvedValueOnce(false);

    withCronSafetyMock.mockImplementationOnce(
      async (
        _jobName: string,
        handler: () => Promise<{ found: number; processed: number; failed: number }>,
      ) => {
        const result = await handler();
        return {
          runId: "run-live-reminders",
          status: "completed",
          itemsFound: result.found,
          itemsProcessed: result.processed,
          itemsFailed: result.failed,
          durationMs: 19,
        };
      },
    );

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      runId: "run-live-reminders",
      status: "completed",
      found: 3,
      processed: 1,
      failed: 1,
      durationMs: 19,
    });
    expect(getUpcomingRemindersMock).toHaveBeenCalledOnce();
    expect(processReminderMock).toHaveBeenCalledTimes(3);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Failed to process reminder",
      expect.objectContaining({
        reminderId: "rem-2",
        error: "sms delivery failed",
      }),
    );
  });
});
