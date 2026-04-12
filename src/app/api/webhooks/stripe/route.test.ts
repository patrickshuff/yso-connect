import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const {
  constructEventMock,
  subscriptionRetrieveMock,
  updateMock,
  updateSetMock,
  insertMock,
  insertValuesMock,
  stripeWebhookReturningMock,
  selectMock,
  selectWhereMock,
  sendEmailMock,
  buildPaymentFailedEmailMock,
  loggerInfoMock,
  loggerWarnMock,
  loggerErrorMock,
  eqMock,
  organizationsTable,
  paymentsTable,
  funnelEventsTable,
  stripeWebhookEventsTable,
} = vi.hoisted(() => {
  const constructEventMock = vi.fn();
  const subscriptionRetrieveMock = vi.fn();

  const updateWhereMock = vi.fn(async () => [] as unknown[]);
  const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  const stripeWebhookReturningMock = vi.fn(async () => [{ eventId: "evt_1" }] as unknown[]);
  const stripeWebhookInsertValuesMock = vi.fn(() => ({
    onConflictDoNothing: () => ({
      returning: stripeWebhookReturningMock,
    }),
  }));
  const insertValuesMock = vi.fn(async () => [] as unknown[]);
  const stripeWebhookEventsTable = { eventId: "stripe_webhook_events.event_id" };
  const insertMock = vi.fn((table) => {
    if (table === stripeWebhookEventsTable) {
      return { values: stripeWebhookInsertValuesMock };
    }
    return { values: insertValuesMock };
  });

  const selectWhereMock = vi.fn(async () => [] as unknown[]);
  const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn(() => ({ from: selectFromMock }));

  const sendEmailMock = vi.fn(async () => ({ success: true, id: "email_1" }));
  const buildPaymentFailedEmailMock = vi.fn(() => "<html>Payment Failed</html>");
  const loggerInfoMock = vi.fn();
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
    stripeWebhookReturningMock,
    selectMock,
    selectWhereMock,
    sendEmailMock,
    buildPaymentFailedEmailMock,
    loggerInfoMock,
    loggerWarnMock,
    loggerErrorMock,
    eqMock,
    organizationsTable,
    paymentsTable,
    funnelEventsTable,
    stripeWebhookEventsTable,
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
  stripeWebhookEvents: stripeWebhookEventsTable,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/email-templates", () => ({
  buildPaymentFailedEmail: buildPaymentFailedEmailMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: loggerInfoMock,
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
    stripeWebhookReturningMock.mockResolvedValue([{ eventId: "evt_1" }]);
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

  it("uses non-null fallback organizationSlug for webhook telemetry when org slug lookup is missing", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          parent: {
            subscription_details: {
              subscription: "sub_missing_slug",
            },
          },
        },
      },
    });
    subscriptionRetrieveMock.mockResolvedValue({
      metadata: { orgId: "org_no_slug" },
      status: "past_due",
      items: { data: [{ current_period_end: 2000000000 }] },
    });
    // First select returns no slug, second returns org for notification email path.
    selectWhereMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "org_no_slug", name: "No Slug Org", contactEmail: "billing@noslug.test" },
      ]);

    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "payment_failed",
        organizationId: "org_no_slug",
        organizationSlug: "unknown-org-org_no_slug",
      }),
    );
    expect(loggerWarnMock).toHaveBeenCalledWith(
      "Billing webhook telemetry missing organization slug; using fallback",
      expect.objectContaining({
        organizationId: "org_no_slug",
        eventName: "payment_failed",
        fallbackSlug: "unknown-org-org_no_slug",
      }),
    );
  });

  it("skips side effects for duplicate Stripe webhook deliveries", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_duplicate",
      type: "invoice.payment_failed",
      data: {
        object: {
          parent: {
            subscription_details: {
              subscription: "sub_duplicate",
            },
          },
        },
      },
    });
    stripeWebhookReturningMock.mockResolvedValueOnce([]);

    const res = await POST(makeRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ received: true, duplicate: true });
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(insertValuesMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "Skipping duplicate Stripe webhook delivery",
      expect.objectContaining({
        eventId: "evt_duplicate",
        eventType: "invoice.payment_failed",
      }),
    );
  });
});
