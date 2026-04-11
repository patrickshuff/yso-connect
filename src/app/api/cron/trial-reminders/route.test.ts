import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  sendAllTrialRemindersMock,
  withCronSafetyMock,
  loggerErrorMock,
  loggerInfoMock,
} = vi.hoisted(() => {
  const sendAllTrialRemindersMock = vi.fn();
  const withCronSafetyMock = vi.fn();
  const loggerErrorMock = vi.fn();
  const loggerInfoMock = vi.fn();
  return {
    sendAllTrialRemindersMock,
    withCronSafetyMock,
    loggerErrorMock,
    loggerInfoMock,
  };
});

vi.mock("@/lib/trial-emails", () => ({
  sendAllTrialReminders: sendAllTrialRemindersMock,
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
  return new NextRequest("http://localhost/api/cron/trial-reminders", { headers });
}

describe("GET /api/cron/trial-reminders", () => {
  const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    if (ORIGINAL_CRON_SECRET === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
    }
    vi.clearAllMocks();
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

  it("returns 401 when no authorization header is provided", async () => {
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

  it("returns 200 with aggregated run data when auth is valid and cron completes", async () => {
    withCronSafetyMock.mockResolvedValueOnce({
      runId: "run-abc-123",
      status: "completed",
      itemsFound: 5,
      itemsProcessed: 4,
      itemsFailed: 1,
      durationMs: 88,
    });

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      runId: "run-abc-123",
      status: "completed",
      found: 5,
      processed: 4,
      failed: 1,
      durationMs: 88,
    });
    expect(withCronSafetyMock).toHaveBeenCalledWith(
      "trial-reminders",
      expect.any(Function),
    );
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
  });

  it("invokes sendAllTrialReminders inside the cron handler", async () => {
    sendAllTrialRemindersMock.mockResolvedValueOnce({
      reminder7d: { found: 2, sent: 2, failed: 0 },
      reminder25d: { found: 1, sent: 1, failed: 0 },
    });

    withCronSafetyMock.mockImplementationOnce(
      async (_name: string, handler: () => Promise<{ found: number; processed: number; failed: number }>) => {
        const result = await handler();
        return {
          runId: "run-test",
          status: "completed",
          itemsFound: result.found,
          itemsProcessed: result.processed,
          itemsFailed: result.failed,
          durationMs: 10,
        };
      },
    );

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(3);
    expect(body.processed).toBe(3);
    expect(body.failed).toBe(0);
    expect(sendAllTrialRemindersMock).toHaveBeenCalledOnce();
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "Trial reminder cron complete",
      expect.objectContaining({ reminder7d: expect.any(Object) }),
    );
  });
});
