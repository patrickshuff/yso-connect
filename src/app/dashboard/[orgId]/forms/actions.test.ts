import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  requireRoleMock,
  whereMock,
  selectMock,
  returningMock,
  valuesMock,
  insertMock,
  eqMock,
  andMock,
} = vi.hoisted(() => {
  const returningMock = vi.fn();
  const valuesMock = vi.fn(() => ({ returning: returningMock }));
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  const whereMock = vi.fn();
  const fromMock = vi.fn(() => ({ where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));

  return {
    authMock: vi.fn(),
    requireRoleMock: vi.fn(),
    whereMock,
    selectMock,
    returningMock,
    valuesMock,
    insertMock,
    eqMock: vi.fn((field, value) => ({ eq: [field, value] })),
    andMock: vi.fn((...clauses) => ({ and: clauses })),
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("drizzle-orm", () => ({
  eq: eqMock,
  and: andMock,
  sql: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

vi.mock("@/db/schema", () => ({
  forms: {
    id: "forms.id",
    organizationId: "forms.organizationId",
  },
  formAssignments: {
    id: "formAssignments.id",
    formId: "formAssignments.formId",
    organizationId: "formAssignments.organizationId",
  },
  formSubmissions: {},
  guardians: {
    id: "guardians.id",
    organizationId: "guardians.organizationId",
    clerkUserId: "guardians.clerkUserId",
  },
  players: {},
  playerGuardians: {},
  teams: {},
  teamPlayers: {},
}));

vi.mock("@/lib/memberships", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/validation", () => ({
  validateLength: vi.fn((value: string | null) => {
    if (!value || value.trim().length === 0) {
      return { valid: false, error: "Value is required" };
    }
    return { valid: true, value: value.trim() };
  }),
  validateEnum: vi.fn((value: string | null, allowed: string[]) => {
    if (!value || !allowed.includes(value)) {
      return { valid: false, error: `Invalid value` };
    }
    return { valid: true, value };
  }),
  MAX_LENGTHS: {
    title: 256,
    description: 2048,
    content: 50000,
  },
  VALID_FORM_TYPES: ["waiver", "medical", "permission", "registration", "custom"],
}));

import { assignForm, submitForm } from "./actions";

// ---------------------------------------------------------------------------
// assignForm — form ownership bypass fix
// ---------------------------------------------------------------------------

describe("assignForm — form ownership bypass fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
    requireRoleMock.mockResolvedValue({ role: "admin" });
  });

  it("returns Unauthorized when user is not signed in", async () => {
    authMock.mockResolvedValue({ userId: null });

    const formData = new FormData();
    formData.set("assignmentType", "organization");

    const result = await assignForm("org_123", "form_123", formData);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns error when assignmentType is missing", async () => {
    const formData = new FormData();

    const result = await assignForm("org_123", "form_123", formData);

    expect(result).toEqual({ success: false, error: "Assignment type is required" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns Form not found and does NOT insert when form does not belong to org", async () => {
    // Ownership check: form not found in this org
    whereMock.mockResolvedValueOnce([]);

    const formData = new FormData();
    formData.set("assignmentType", "organization");

    const result = await assignForm("org_123", "form_foreign", formData);

    expect(result).toEqual({ success: false, error: "Form not found" });
    expect(whereMock).toHaveBeenCalledTimes(1);
    expect(eqMock).toHaveBeenCalledWith("forms.id", "form_foreign");
    expect(eqMock).toHaveBeenCalledWith("forms.organizationId", "org_123");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("proceeds to insert assignment when form ownership check passes", async () => {
    // Ownership check passes
    whereMock.mockResolvedValueOnce([{ id: "form_123" }]);
    // insert().values().returning() resolves with new assignment
    returningMock.mockResolvedValueOnce([{ id: "assign_abc" }]);

    const formData = new FormData();
    formData.set("assignmentType", "organization");

    const result = await assignForm("org_123", "form_123", formData);

    expect(result).toEqual({ success: true, assignmentId: "assign_abc" });
    expect(whereMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: "form_123",
        organizationId: "org_123",
        assignmentType: "organization",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// submitForm — assignment ownership bypass fix
// ---------------------------------------------------------------------------

describe("submitForm — assignment ownership bypass fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
    requireRoleMock.mockResolvedValue({ role: "guardian" });
  });

  function makeFormData(overrides: Record<string, string> = {}): FormData {
    const formData = new FormData();
    formData.set("assignmentId", "assign_123");
    formData.set("guardianId", "guardian_456");
    formData.set("playerId", "player_789");
    formData.set("acknowledged", "on");
    for (const [key, value] of Object.entries(overrides)) {
      formData.set(key, value);
    }
    return formData;
  }

  it("returns Unauthorized when user is not signed in", async () => {
    authMock.mockResolvedValue({ userId: null });

    const result = await submitForm("org_123", "form_123", makeFormData());

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns Missing required fields when assignmentId is absent", async () => {
    const formData = new FormData();
    formData.set("guardianId", "guardian_456");
    formData.set("playerId", "player_789");
    formData.set("acknowledged", "on");

    const result = await submitForm("org_123", "form_123", formData);

    expect(result).toEqual({ success: false, error: "Missing required fields" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns error when acknowledged is not set", async () => {
    const formData = makeFormData();
    formData.delete("acknowledged");

    const result = await submitForm("org_123", "form_123", formData);

    expect(result).toEqual({ success: false, error: "You must acknowledge the form" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns Invalid form assignment when assignment does not belong to this form+org", async () => {
    // Assignment check: not found (cross-org or wrong formId)
    whereMock.mockResolvedValueOnce([]);

    const result = await submitForm("org_123", "form_123", makeFormData());

    expect(result).toEqual({ success: false, error: "Invalid form assignment" });
    expect(whereMock).toHaveBeenCalledTimes(1);
    expect(eqMock).toHaveBeenCalledWith("formAssignments.id", "assign_123");
    expect(eqMock).toHaveBeenCalledWith("formAssignments.formId", "form_123");
    expect(eqMock).toHaveBeenCalledWith("formAssignments.organizationId", "org_123");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns Guardian not found or not authorized when guardian is not linked to calling user", async () => {
    // Assignment check passes
    whereMock.mockResolvedValueOnce([{ id: "assign_123" }]);
    // Guardian check: not found (different org or different clerkUserId)
    whereMock.mockResolvedValueOnce([]);

    const result = await submitForm("org_123", "form_123", makeFormData());

    expect(result).toEqual({ success: false, error: "Guardian not found or not authorized" });
    expect(whereMock).toHaveBeenCalledTimes(2);
    expect(eqMock).toHaveBeenCalledWith("guardians.id", "guardian_456");
    expect(eqMock).toHaveBeenCalledWith("guardians.organizationId", "org_123");
    expect(eqMock).toHaveBeenCalledWith("guardians.clerkUserId", "user_1");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts submission when both ownership checks pass", async () => {
    // Assignment check passes
    whereMock.mockResolvedValueOnce([{ id: "assign_123" }]);
    // Guardian check passes
    whereMock.mockResolvedValueOnce([{
      id: "guardian_456",
      organizationId: "org_123",
      clerkUserId: "user_1",
      firstName: "Jane",
      lastName: "Doe",
    }]);
    // insert().values() resolves (submitForm doesn't call .returning())
    (valuesMock as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const result = await submitForm("org_123", "form_123", makeFormData());

    expect(result).toEqual({ success: true });
    expect(whereMock).toHaveBeenCalledTimes(2);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formAssignmentId: "assign_123",
        guardianId: "guardian_456",
        playerId: "player_789",
        status: "completed",
      }),
    );
  });
});
