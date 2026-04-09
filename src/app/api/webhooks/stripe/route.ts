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

async function handleCoachBillingPayment(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const orgId = session.metadata?.orgId;
  if (!orgId) {
    return;
  }

  const paidUntil = new Date();
  paidUntil.setMonth(paidUntil.getMonth() + 6);

  await db
    .update(organizations)
    .set({
      subscriptionStatus: "active",
      subscriptionPaidUntil: paidUntil,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));
}
