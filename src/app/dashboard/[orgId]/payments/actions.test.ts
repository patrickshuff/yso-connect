import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  requireRoleMock,
  selectMock,
  eqMock,
  andMock,
  sessionsCreateMock,
  state,
} = vi.hoisted(() => {
  const state = {
    paymentItemsResult: [] as Array<{
      id: string;
      title: string;
      description: string | null;
      amount: number;
      currency: string;
    }>,
  };
  const whereMock = vi.fn(async () => state.paymentItemsResult);
  const fromMock = vi.fn(() => ({ where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));

  return {
    authMock: vi.fn(),
    requireRoleMock: vi.fn(),
    selectMock,
    eqMock: vi.fn((field, value) => ({ eq: [field, value] })),
    andMock: vi.fn((...clauses) => ({ and: clauses })),
    sessionsCreateMock: vi.fn(),
    state,
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("drizzle-orm", () => ({
  eq: eqMock,
  and: andMock,
  sql: vi.fn(() => ({})),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/db/schema", () => ({
  paymentItems: {
    id: "paymentItems.id",
    organizationId: "paymentItems.organizationId",
  },
  payments: {},
}));

vi.mock("@/lib/memberships", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: sessionsCreateMock,
      },
    },
  },
}));

import { createCheckoutSession, createPaymentItem } from "./actions";

describe("payments actions auth gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
    state.paymentItemsResult = [];
  });

  it("rejects createPaymentItem when user is not signed in", async () => {
    const formData = new FormData();
    formData.set("title", "Spring fee");
    formData.set("amount", "99");
    formData.set("paymentType", "fee");

    const result = await createPaymentItem("org_123", formData);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects createCheckoutSession when user is not signed in", async () => {
    const result = await createCheckoutSession("org_123", "item_123");
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("scopes checkout item lookup to organization and rejects cross-tenant ids", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    requireRoleMock.mockResolvedValue({ role: "admin" });
    state.paymentItemsResult = [];

    const result = await createCheckoutSession("org_123", "item_foreign");

    expect(result).toEqual({ success: false, error: "Payment item not found" });
    expect(eqMock).toHaveBeenCalledWith("paymentItems.id", "item_foreign");
    expect(eqMock).toHaveBeenCalledWith("paymentItems.organizationId", "org_123");
    expect(andMock).toHaveBeenCalled();
    expect(sessionsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects createPaymentItem when amount exceeds $50,000 cap", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    requireRoleMock.mockResolvedValue({ role: "admin" });

    const formData = new FormData();
    formData.set("title", "Big fee");
    formData.set("amount", "50001");
    formData.set("paymentType", "fee");

    const result = await createPaymentItem("org_123", formData);
    expect(result).toEqual({ success: false, error: "Amount exceeds $50,000 maximum" });
  });

  it("rejects createPaymentItem when amount is negative", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    requireRoleMock.mockResolvedValue({ role: "admin" });

    const formData = new FormData();
    formData.set("title", "Negative fee");
    formData.set("amount", "-10");
    formData.set("paymentType", "fee");

    const result = await createPaymentItem("org_123", formData);
    expect(result).toEqual({ success: false, error: "Amount must be a positive number" });
  });

  it("creates checkout session only when item belongs to same org", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    requireRoleMock.mockResolvedValue({ role: "admin" });
    state.paymentItemsResult = [
      {
        id: "item_123",
        title: "Spring registration",
        description: "Season fee",
        amount: 5000,
        currency: "usd",
      },
    ];
    sessionsCreateMock.mockResolvedValue({ url: "https://stripe.test/session" });

    const result = await createCheckoutSession("org_123", "item_123");

    expect(result).toEqual({ success: true, url: "https://stripe.test/session" });
    expect(sessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          organizationId: "org_123",
          paymentItemId: "item_123",
        },
      }),
    );
  });
});
