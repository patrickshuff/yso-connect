import { afterEach, describe, expect, it, vi } from "vitest";

const {
  dbSelectMock,
  dbInsertMock,
  sendEmailMock,
  buildTrialReminder7dEmailMock,
  buildTrialReminder25dEmailMock,
  loggerWarnMock,
  loggerErrorMock,
  loggerInfoMock,
} = vi.hoisted(() => {
  const dbSelectMock = vi.fn();
  const dbInsertMock = vi.fn();
  const sendEmailMock = vi.fn();
  const buildTrialReminder7dEmailMock = vi.fn().mockReturnValue("<html>7d</html>");
  const buildTrialReminder25dEmailMock = vi.fn().mockReturnValue("<html>25d</html>");
  const loggerWarnMock = vi.fn();
  const loggerErrorMock = vi.fn();
  const loggerInfoMock = vi.fn();
  return {
    dbSelectMock,
    dbInsertMock,
    sendEmailMock,
    buildTrialReminder7dEmailMock,
    buildTrialReminder25dEmailMock,
    loggerWarnMock,
    loggerErrorMock,
    loggerInfoMock,
  };
});

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
    selectDistinct: dbSelectMock,
    insert: dbInsertMock,
  },
}));

vi.mock("@/db/schema", () => ({
  organizations: {},
  funnelEvents: { organizationId: "organizationId", eventName: "eventName" },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/email-templates", () => ({
  buildTrialReminder7dEmail: buildTrialReminder7dEmailMock,
  buildTrialReminder25dEmail: buildTrialReminder25dEmailMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: loggerWarnMock,
    error: loggerErrorMock,
    info: loggerInfoMock,
  },
}));

// drizzle-orm is used for its operator functions; mock them as pass-throughs
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ op: "and", args }),
  eq: (col: unknown, val: unknown) => ({ op: "eq", col, val }),
  gte: (col: unknown, val: unknown) => ({ op: "gte", col, val }),
  lt: (col: unknown, val: unknown) => ({ op: "lt", col, val }),
  notInArray: (col: unknown, arr: unknown) => ({ op: "notInArray", col, arr }),
}));

import { sendAllTrialReminders, sendTrialReminder7d, sendTrialReminder25d } from "./trial-emails";

function makeOrg(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
}> = {}) {
  return {
    id: "org-uuid-1",
    name: "Test League",
    slug: "test-league",
    contactEmail: "coach@test.com",
    subscriptionStatus: "trial",
    trialEndsAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

function makeChain(result: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
}

function setupDb(sentIds: string[], candidates: ReturnType<typeof makeOrg>[]) {
  let callCount = 0;

  dbSelectMock.mockImplementation(() => {
    callCount++;
    // First call = getSentOrgIds (selectDistinct), second call = candidates
    if (callCount % 2 === 1) {
      return makeChain(sentIds.map((id) => ({ organizationId: id })));
    }
    return makeChain(candidates);
  });

  const insertChain = { values: vi.fn().mockResolvedValue([]) };
  dbInsertMock.mockReturnValue(insertChain);
}

describe("sendTrialReminder7d", () => {
  afterEach(() => vi.clearAllMocks());

  it("sends email to eligible org and logs funnel event", async () => {
    const org = makeOrg();
    setupDb([], [org]);
    sendEmailMock.mockResolvedValue({ success: true, id: "email-id-1" });

    const result = await sendTrialReminder7d(new Date());

    expect(result.found).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledWith(
      "coach@test.com",
      expect.stringContaining("one week in"),
      "<html>7d</html>",
    );
    expect(dbInsertMock).toHaveBeenCalledOnce();
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "Trial 7d reminder sent",
      expect.objectContaining({ orgId: org.id }),
    );
  });

  it("skips org without contact email", async () => {
    const org = makeOrg({ contactEmail: null });
    setupDb([], [org]);

    const result = await sendTrialReminder7d(new Date());

    expect(result.found).toBe(1);
    expect(result.sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(loggerWarnMock).toHaveBeenCalled();
  });

  it("counts failed send and logs error", async () => {
    const org = makeOrg();
    setupDb([], [org]);
    sendEmailMock.mockResolvedValue({ success: false, error: "Resend error" });

    const result = await sendTrialReminder7d(new Date());

    expect(result.found).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Failed to send trial 7d reminder",
      expect.objectContaining({ orgId: org.id }),
    );
  });

  it("returns zero counts when no candidates in window", async () => {
    setupDb([], []);

    const result = await sendTrialReminder7d(new Date());

    expect(result).toEqual({ found: 0, sent: 0, failed: 0 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("sendTrialReminder25d", () => {
  afterEach(() => vi.clearAllMocks());

  it("sends email with correct days remaining", async () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const org = makeOrg({ trialEndsAt });
    setupDb([], [org]);
    sendEmailMock.mockResolvedValue({ success: true, id: "email-id-2" });

    const result = await sendTrialReminder25d(now);

    expect(result.found).toBe(1);
    expect(result.sent).toBe(1);
    expect(buildTrialReminder25dEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ daysRemaining: 5 }),
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      "coach@test.com",
      expect.stringContaining("days left"),
      "<html>25d</html>",
    );
  });

  it("uses singular 'day' in subject when daysRemaining is 1", async () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const org = makeOrg({ trialEndsAt });
    setupDb([], [org]);
    sendEmailMock.mockResolvedValue({ success: true, id: "email-id-3" });

    await sendTrialReminder25d(now);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/^1 day left/),
      expect.any(String),
    );
  });
});

describe("sendAllTrialReminders", () => {
  afterEach(() => vi.clearAllMocks());

  it("runs both reminder passes and returns combined results", async () => {
    // Both passes return empty candidate lists
    const makeChain = (result: unknown) => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
    });

    dbSelectMock.mockReturnValue(makeChain([]));

    const result = await sendAllTrialReminders(new Date());

    expect(result).toHaveProperty("reminder7d");
    expect(result).toHaveProperty("reminder25d");
    expect(result.reminder7d).toEqual({ found: 0, sent: 0, failed: 0 });
    expect(result.reminder25d).toEqual({ found: 0, sent: 0, failed: 0 });
  });
});
