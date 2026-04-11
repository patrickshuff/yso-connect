import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const {
  constructEventMock,
  subscriptionRetrieveMock,
  updateMock,
  updateSetMock,
  insertMock,
  insertValuesMock,
  selectMock,
  selectWhereMock,
  sendEmailMock,
  buildPaymentFailedEmailMock,
  loggerWarnMock,
  loggerErrorMock,
  eqMock,
  organizationsTable,
  paymentsTable,
  funnelEventsTable,
} = vi.hoisted(() => {
  const constructEventMock = vi.fn();
  const subscriptionRetrieveMock = vi.fn();

  const updateWhereMock = vi.fn(async () => []);
  const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  const insertValuesMock = vi.fn(async () => []);
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));

  const selectWhereMock = vi.fn(async () => []);
  const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn(() => ({ from: selectFromMock }));

  const sendEmailMock = vi.fn(async () => ({ success: true, id: "email_1" }));
  const buildPaymentFailedEmailMock = vi.fn(() => "<html>Payment Failed</html>");
  const loggerWarnMock = vi.fn();
  const loggerErrorMock = vi.fn();
  const eqMock = vi.fn((left, right) => ({ left, right }));

  const organizationsTable = {
    id: "organizations.id",
    name: "organizations.name",
    contactEmail: "organizations.contact_email",
  };
  const paymentsTable = {};
  const funnelEventsTable = {};

  return {
    constructEventMock,
    subscriptionRetrieveMock,
    updateMock,
    updateSetMock,
    insertMock,
    insertValuesMock,
    selectMock,
    selectWhereMock,
    sendEmailMock,
    buildPaymentFailedEmailMock,
    loggerWarnMock,
    loggerErrorMock,
    eqMock,
    organizationsTable,
    paymentsTable,
    funnelEventsTable,
  };
});

vi.mock("drizzle-orm", () => ({
  eq: eqMock,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
    subscriptions: {
      retrieve: subscriptionRetrieveMock,
    },
  },
}));

vi.mock("@/db", () => ({
  db: {
    update: updateMock,
    insert: insertMock,
    select: selectMock,
  },
}));

vi.mock("@/db/schema", () => ({
  organizations: organizationsTable,
  payments: paymentsTable,
  funnelEvents: funnelEventsTable,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/email-templates", () => ({
  buildPaymentFailedEmail: buildPaymentFailedEmailMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: loggerWarnMock,
    error: loggerErrorMock,
  },
}));

import { POST } from "./route";

function makeRequest(): Request {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "sig_test",
    },
    body: JSON.stringify({ ok: true }),
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks org as past_due, emails admin, and logs funnel event on invoice.payment_failed", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          parent: {
            subscription_details: {
              subscription: "sub_123",
            },
          },
        },
      },
    });
    subscriptionRetrieveMock.mockResolvedValue({
      metadata: { orgId: "org_1" },
      status: "past_due",
      items: { data: [{ current_period_end: 2000000000 }] },
    });
    // First select for org slug, second for notifyPaymentFailed
    selectWhereMock
      .mockResolvedValueOnce([{ slug: "acme-soccer" }])
      .mockResolvedValueOnce([
        { id: "org_1", name: "Acme Soccer", contactEmail: "admin@acme.test" },
      ]);

    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(organizationsTable);
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "past_due",
      }),
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      "admin@acme.test",
      "Payment failed for Acme Soccer",
      "<html>Payment Failed</html>",
    );
    expect(insertMock).toHaveBeenCalledWith(funnelEventsTable);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "payment_failed",
        organizationId: "org_1",
        organizationSlug: "acme-soccer",
      }),
    );
  });

  it("marks org as canceled and logs cancellation funnel event on customer.subscription.deleted", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { orgId: "org_2" },
          status: "canceled",
          items: { data: [{ current_period_end: 2100000000 }] },
        },
      },
    });
    selectWhereMock.mockResolvedValueOnce([{ slug: "acme-soccer-2" }]);

    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(200);
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "canceled",
      }),
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "subscription_canceled",
        organizationId: "org_2",
        organizationSlug: "acme-soccer-2",
      }),
    );
  });
});
