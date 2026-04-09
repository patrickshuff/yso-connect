import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { payments, organizations } from "@/db/schema";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  if (
    event.type === "invoice.paid" ||
    event.type === "customer.subscription.updated"
  ) {
    await handleSubscriptionEvent(event);
  }

  return NextResponse.json({ received: true });
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
}

async function handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
  let subscription: Stripe.Subscription;

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const subRef = invoice.parent?.subscription_details?.subscription;
    if (!subRef) return;
    const subId = typeof subRef === "string" ? subRef : subRef.id;
    subscription = await stripe.subscriptions.retrieve(subId);
  } else {
    subscription = event.data.object as Stripe.Subscription;
  }

  const orgId = subscription.metadata?.orgId;
  if (!orgId) return;

  const paidUntil = getPeriodEndFromSubscription(subscription);
  const isActive = subscription.status === "active";

  await db
    .update(organizations)
    .set({
      subscriptionStatus: isActive ? "active" : "expired",
      subscriptionPaidUntil: paidUntil,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));
}
