import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import {
  funnelEvents,
  organizations,
  payments,
  stripeWebhookEvents,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { buildPaymentFailedEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  const isFirstDelivery = await claimWebhookEvent(event.id, event.type);
  if (!isFirstDelivery) {
    logger.info("Skipping duplicate Stripe webhook delivery", {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  if (
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_failed" ||
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    await handleSubscriptionEvent(event);
  }

  return NextResponse.json({ received: true });
}

async function claimWebhookEvent(
  eventId: string,
  eventType: Stripe.Event.Type,
): Promise<boolean> {
  const inserted = await db
    .insert(stripeWebhookEvents)
    .values({
      eventId,
      eventType,
    })
    .onConflictDoNothing()
    .returning({ eventId: stripeWebhookEvents.eventId });

  return inserted.length > 0;
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const metadataType = session.metadata?.type;

  if (metadataType === "coach_billing") {
    await handleCoachBillingPayment(session);
    return;
  }

  const organizationId = session.metadata?.organizationId;
  const paymentItemId = session.metadata?.paymentItemId;

  if (!organizationId || !paymentItemId) {
    return;
  }

  await db.insert(payments).values({
    organizationId,
    paymentItemId,
    amount: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    status: "completed",
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    paidAt: new Date(),
    payerName: session.customer_details?.name ?? "Unknown",
    payerEmail: session.customer_details?.email ?? null,
  });
}

function getPeriodEndFromSubscription(sub: Stripe.Subscription): Date {
  const firstItem = sub.items.data[0];
  if (firstItem) {
    return new Date(firstItem.current_period_end * 1000);
  }
  // Fallback: 1 month from now
  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 1);
  return fallback;
}

async function handleCoachBillingPayment(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const orgId = session.metadata?.orgId;
  if (!orgId) {
    return;
  }

  let paidUntil: Date;
  if (session.subscription) {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    paidUntil = getPeriodEndFromSubscription(sub);
  } else {
    paidUntil = new Date();
    paidUntil.setMonth(paidUntil.getMonth() + 1);
  }

  await db
    .update(organizations)
    .set({
      subscriptionStatus: "active",
      subscriptionPaidUntil: paidUntil,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));

  const [org] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  await logBillingFunnelEvent("checkout_completed", orgId, org?.slug);
}

async function handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
  let subscription: Stripe.Subscription;

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subRef = invoice.parent?.subscription_details?.subscription;
    if (!subRef) {
      return;
    }
    const subId = typeof subRef === "string" ? subRef : subRef.id;
    subscription = await stripe.subscriptions.retrieve(subId);
  } else {
    subscription = event.data.object as Stripe.Subscription;
  }

  const orgId = subscription.metadata?.orgId;
  if (!orgId) return;

  const paidUntil = getPeriodEndFromSubscription(subscription);
  const nextStatus = getOrganizationSubscriptionStatus(event.type, subscription);

  await db
    .update(organizations)
    .set({
      subscriptionStatus: nextStatus,
      subscriptionPaidUntil: paidUntil,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));

  const [org] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (event.type === "invoice.payment_failed") {
    await notifyPaymentFailed(orgId);
    await logBillingFunnelEvent("payment_failed", orgId, org?.slug);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    await logBillingFunnelEvent("subscription_canceled", orgId, org?.slug);
  }
}

function getOrganizationSubscriptionStatus(
  eventType: Stripe.Event.Type,
  subscription: Stripe.Subscription,
): "active" | "past_due" | "canceled" | "expired" {
  if (eventType === "invoice.paid") {
    return "active";
  }
  if (eventType === "invoice.payment_failed") {
    return "past_due";
  }
  if (eventType === "customer.subscription.deleted") {
    return "canceled";
  }

  switch (subscription.status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "expired";
  }
}

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function notifyPaymentFailed(orgId: string): Promise<void> {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      contactEmail: organizations.contactEmail,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org?.contactEmail) {
    logger.warn("Skipping payment failed email: missing organization contact email", {
      orgId,
    });
    return;
  }

  const html = buildPaymentFailedEmail({
    orgName: org.name,
    appUrl: getAppUrl(),
    orgId: org.id,
  });

  const sendResult = await sendEmail(
    org.contactEmail,
    `Payment failed for ${org.name}`,
    html,
  );

  if (!sendResult.success) {
    logger.error("Failed to send payment failed email", {
      orgId,
      error: sendResult.error,
    });
  }
}

async function logBillingFunnelEvent(
  eventName: "payment_failed" | "subscription_canceled" | "checkout_completed",
  organizationId: string,
  organizationSlug?: string | null,
): Promise<void> {
  const normalizedOrganizationSlug = normalizeOrganizationSlug(
    organizationSlug,
    organizationId,
    eventName,
  );

  await db.insert(funnelEvents).values({
    eventName,
    organizationId,
    organizationSlug: normalizedOrganizationSlug,
    location: "stripe_webhook",
    pagePath: "/api/webhooks/stripe",
  });
}

function normalizeOrganizationSlug(
  organizationSlug: string | null | undefined,
  organizationId: string,
  eventName: string,
): string {
  if (organizationSlug && organizationSlug.trim().length > 0) {
    return organizationSlug.trim();
  }

  const fallbackSlug = `unknown-org-${organizationId}`;
  logger.warn("Billing webhook telemetry missing organization slug; using fallback", {
    organizationId,
    eventName,
    fallbackSlug,
  });
  return fallbackSlug;
}
