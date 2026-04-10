import { describe, expect, it } from "vitest";
import { requireActiveAccess } from "@/lib/trial";

function makeOrg(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "org_1",
    name: "Org",
    slug: "org",
    description: null,
    logoUrl: null,
    websiteUrl: null,
    contactEmail: null,
    contactPhone: null,
    timezone: "America/New_York",
    trialEndsAt: null,
    subscriptionStatus: "none",
    subscriptionPaidUntil: null,
    reminders24hEnabled: true,
    reminders2hEnabled: true,
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  } as never;
}

describe("trial access checks", () => {
  it("returns full access for active subscriptions", () => {
    const result = requireActiveAccess(
      makeOrg({
        subscriptionStatus: "active",
        subscriptionPaidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    );
    expect(result).toEqual({ allowed: true, mode: "full" });
  });

  it("returns read-only access for past_due subscriptions", () => {
    const result = requireActiveAccess(
      makeOrg({
        subscriptionStatus: "past_due",
      }),
    );
    expect(result).toEqual({ allowed: true, mode: "read_only" });
  });

  it("denies access for canceled subscriptions", () => {
    const result = requireActiveAccess(
      makeOrg({
        subscriptionStatus: "canceled",
      }),
    );
    expect(result).toMatchObject({
      allowed: false,
      reason: "subscription_canceled",
    });
  });
});
