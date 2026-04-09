import type { InferSelectModel } from "drizzle-orm";
import type { organizations } from "@/db/schema";

type Organization = InferSelectModel<typeof organizations>;

export function isTrialActive(org: Organization): boolean {
  if (!org.trialEndsAt) {
    return false;
  }
  return new Date() < org.trialEndsAt;
}

export function isSubscriptionActive(org: Organization): boolean {
  return (
    org.subscriptionStatus === "active" &&
    org.subscriptionPaidUntil !== null &&
    new Date() < org.subscriptionPaidUntil
  );
}

interface AccessAllowed {
  allowed: true;
}

interface AccessDenied {
  allowed: false;
  reason: "trial_expired" | "subscription_expired";
  trialEndsAt: Date | null;
  daysRemaining: number;
}

export type AccessCheckResult = AccessAllowed | AccessDenied;

export function requireActiveAccess(org: Organization): AccessCheckResult {
  if (isSubscriptionActive(org)) {
    return { allowed: true };
  }

  if (isTrialActive(org)) {
    return { allowed: true };
  }

  const now = new Date();
  const trialEndsAt = org.trialEndsAt;
  const daysRemaining = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const reason =
    org.subscriptionStatus === "active" || org.subscriptionStatus === "expired"
      ? "subscription_expired"
      : "trial_expired";

  return {
    allowed: false,
    reason,
    trialEndsAt,
    daysRemaining: Math.max(daysRemaining, 0),
  };
}

export function getTrialDaysRemaining(org: Organization): number {
  if (!org.trialEndsAt) {
    return 0;
  }
  const now = new Date();
  const diff = Math.ceil(
    (org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(diff, 0);
}
