import { beforeEach, describe, expect, it, vi } from "vitest";

const { state, selectMock, eqMock, andMock } = vi.hoisted(
  () => {
    const state = {
      membership: null as
        | {
            role: "owner" | "admin" | "coach" | "guardian";
          }
        | null,
    };

    const whereMock = vi.fn(async () =>
      state.membership ? [state.membership] : [],
    );
    const fromMock = vi.fn(() => ({ where: whereMock }));
    const selectMock = vi.fn(() => ({ from: fromMock }));

    const eqMock = vi.fn((field, value) => ({ eq: [field, value] }));
    const andMock = vi.fn((...clauses) => ({ and: clauses }));

    return { state, selectMock, eqMock, andMock };
  },
);

vi.mock("drizzle-orm", () => ({
  eq: eqMock,
  and: andMock,
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/db/schema", () => ({
  memberships: {
    organizationId: "memberships.organizationId",
    clerkUserId: "memberships.clerkUserId",
    role: "memberships.role",
  },
  organizations: {
    id: "organizations.id",
  },
}));

import { AuthorizationError, requireRole } from "./memberships";

describe("requireRole", () => {
  beforeEach(() => {
    state.membership = null;
  });

  it("throws when user is not a member of the organization", async () => {
    await expect(requireRole("org_a", "user_1", "coach")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("throws when user role is below required role", async () => {
    state.membership = { role: "guardian" };

    await expect(requireRole("org_a", "user_1", "coach")).rejects.toMatchObject(
      {
        message: "Insufficient permissions",
        statusCode: 403,
      },
    );
  });

  it("allows access when user role meets minimum role", async () => {
    state.membership = { role: "admin" };

    await expect(requireRole("org_b", "user_2", "coach")).resolves.toMatchObject(
      {
        role: "admin",
      },
    );

    expect(eqMock).toHaveBeenCalledWith("memberships.organizationId", "org_b");
    expect(eqMock).toHaveBeenCalledWith("memberships.clerkUserId", "user_2");
  });
});
