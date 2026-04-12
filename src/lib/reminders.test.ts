import { beforeEach, describe, expect, it, vi } from "vitest";
import { reminders as remindersTable } from "@/db/schema";

const {
  insertValuesMock,
  insertMock,
  returningMock,
  setMock,
  updateMock,
  selectWhereMock,
  selectMock,
  sendMessageMock,
} = vi.hoisted(() => {
  const insertValuesMock = vi.fn(async () => [] as unknown[]);
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));
  const returningMock = vi.fn(async () => [] as unknown[]);
  const whereMock = vi.fn(() => ({ returning: returningMock }));
  const setMock = vi.fn(() => ({ where: whereMock }));
  const updateMock = vi.fn(() => ({ set: setMock }));

  const selectWhereMock = vi.fn(async () => [] as unknown[]);
  const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn(() => ({ from: selectFromMock }));

  const sendMessageMock = vi.fn();

  return {
    insertValuesMock,
    insertMock,
    returningMock,
    setMock,
    updateMock,
    selectWhereMock,
    selectMock,
    sendMessageMock,
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
    update: updateMock,
    select: selectMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => ({ and: args })),
  eq: vi.fn((field, value) => ({ eq: [field, value] })),
  lte: vi.fn((field, value) => ({ lte: [field, value] })),
}));

vi.mock("@/db/schema", () => ({
  reminders: {
    id: "reminders.id",
    sent: "reminders.sent",
    nextAttemptAt: "reminders.nextAttemptAt",
    attemptCount: "reminders.attemptCount",
  },
  events: {},
  organizations: {
    id: "organizations.id",
    reminders24hEnabled: "organizations.reminders24hEnabled",
    reminders2hEnabled: "organizations.reminders2hEnabled",
  },
}));

vi.mock("@/lib/messaging", () => ({
  sendMessage: sendMessageMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { createDefaultReminders, processReminder } from "./reminders";

describe("reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValuesMock.mockResolvedValue([]);
    returningMock.mockResolvedValue([{ id: "rem_1" }]);
    selectWhereMock.mockResolvedValue([{ attemptCount: 0 }]);
  });

  it("creates 24h and 2h reminders for a future event", async () => {
    const eventStart = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await createDefaultReminders("event_1", eventStart);

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    const calls = insertMock.mock.calls as unknown as unknown[][];
    const valueCalls = insertValuesMock.mock.calls as unknown as unknown[][];
    const values = calls[0][0] === remindersTable 
      ? (valueCalls[0][0] as Array<{ reminderType: string }>)
      : [];
    expect(values).toHaveLength(2);
    expect(values.map((v) => v.reminderType)).toEqual([
      "24h_before",
      "2h_before",
    ]);
  });

  it("marks cancelled-event reminders as sent without notifying users", async () => {
    const result = await processReminder("rem_1", {
      id: "event_1",
      organizationId: "org_1",
      teamId: null,
      title: "Practice",
      eventType: "practice",
      location: null,
      startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      isCancelled: true,
    });

    expect(result).toBe(true);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(returningMock).toHaveBeenCalledTimes(1);
  });

  it("returns false when reminder was already claimed by another run", async () => {
    returningMock.mockResolvedValueOnce([]);

    const result = await processReminder("rem_1", {
      id: "event_1",
      organizationId: "org_1",
      teamId: null,
      title: "Practice",
      eventType: "practice",
      location: null,
      startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      isCancelled: false,
    });

    expect(result).toBe(false);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("keeps reminders unsent and schedules retry when delivery provider fails", async () => {
    sendMessageMock.mockRejectedValueOnce(new Error("sms delivery failed"));

    await expect(
      processReminder("rem_1", {
        id: "event_1",
        organizationId: "org_1",
        teamId: null,
        title: "Practice",
        eventType: "practice",
        location: null,
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isCancelled: false,
      }),
    ).rejects.toThrow("sms delivery failed");

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(selectMock).toHaveBeenCalledTimes(1);

    const calls = setMock.mock.calls as unknown as unknown[][];
    const failureUpdateSet = calls[1][0] as {
      sent: boolean;
      sentAt: null;
      attemptCount: number;
      nextAttemptAt: Date;
      lastError: string;
    };
    expect(failureUpdateSet.sent).toBe(false);
    expect(failureUpdateSet.sentAt).toBeNull();
    expect(failureUpdateSet.attemptCount).toBe(1);
    expect(failureUpdateSet.lastError).toBe("sms delivery failed");
    expect(failureUpdateSet.nextAttemptAt).toBeInstanceOf(Date);
    expect(failureUpdateSet.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("uses larger backoff windows for repeated reminder failures", async () => {
    sendMessageMock.mockRejectedValueOnce(new Error("provider timeout"));
    selectWhereMock.mockResolvedValueOnce([{ attemptCount: 3 }]);
    const now = Date.now();

    await expect(
      processReminder("rem_1", {
        id: "event_1",
        organizationId: "org_1",
        teamId: null,
        title: "Practice",
        eventType: "practice",
        location: null,
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isCancelled: false,
      }),
    ).rejects.toThrow("provider timeout");

    const calls = setMock.mock.calls as unknown as unknown[][];
    const failureUpdateSet = calls[1][0] as {
      nextAttemptAt: Date;
      attemptCount: number;
    };
    expect(failureUpdateSet.attemptCount).toBe(4);
    expect(failureUpdateSet.nextAttemptAt.getTime()).toBeGreaterThan(
      now + 5 * 60 * 60 * 1000,
    );
  });
});
