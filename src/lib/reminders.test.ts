import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insertValuesMock,
  insertMock,
  returningMock,
  whereMock,
  setMock,
  updateMock,
  sendMessageMock,
} = vi.hoisted(() => {
  const insertValuesMock = vi.fn();
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));
  const returningMock = vi.fn();
  const whereMock = vi.fn(() => ({ returning: returningMock }));
  const setMock = vi.fn(() => ({ where: whereMock }));
  const updateMock = vi.fn(() => ({ set: setMock }));
  const sendMessageMock = vi.fn();

  return {
    insertValuesMock,
    insertMock,
    returningMock,
    whereMock,
    setMock,
    updateMock,
    sendMessageMock,
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
    update: updateMock,
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
    insertValuesMock.mockResolvedValue(undefined);
    // claimReminder uses returning() — return [{id: "rem_1"}] to indicate claimed
    returningMock.mockResolvedValue([{ id: "rem_1" }]);
  });

  it("creates 24h and 2h reminders for a future event", async () => {
    const eventStart = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await createDefaultReminders("event_1", eventStart);

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    const values = insertValuesMock.mock.calls[0][0] as Array<{
      reminderType: string;
    }>;
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
    // claimReminder does update().set().where().returning()
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledTimes(1);
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
  });
});
