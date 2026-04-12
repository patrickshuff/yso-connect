"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { paymentItems, payments } from "@/db/schema";
import { requireRole } from "@/lib/memberships";
import { stripe } from "@/lib/stripe";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentType = "fee" | "donation" | "sponsorship" | "registration";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface CreatePaymentItemResult extends ActionResult {
  paymentItemId?: string;
}

interface CreateCheckoutResult extends ActionResult {
  url?: string;
}

export interface PaymentItemRow {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  isActive: boolean;
  createdAt: Date;
}

export interface PaymentRow {
  id: string;
  paymentItemTitle: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  payerName: string;
  payerEmail: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// createPaymentItem — admin+
// ---------------------------------------------------------------------------

export async function createPaymentItem(
  orgId: string,
  formData: FormData,
): Promise<CreatePaymentItemResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  const title = formData.get("title") as string | null;
  const description = (formData.get("description") as string | null) || null;
  const amountStr = formData.get("amount") as string | null;
  const paymentType = formData.get("paymentType") as PaymentType | null;

  if (!title || !amountStr || !paymentType) {
    return { success: false, error: "Title, amount, and payment type are required" };
  }

  const dollars = parseFloat(amountStr);
  if (isNaN(dollars) || dollars <= 0) {
    return { success: false, error: "Amount must be a positive number" };
  }
  if (dollars > 50000) {
    return { success: false, error: "Amount exceeds $50,000 maximum" };
  }

  const amountCents = Math.round(dollars * 100);

  const [item] = await db
    .insert(paymentItems)
    .values({
      organizationId: orgId,
      title,
      description,
      amount: amountCents,
      paymentType,
    })
    .returning();

  revalidatePath(`/dashboard/${orgId}/payments`);
  return { success: true, paymentItemId: item.id };
}

// ---------------------------------------------------------------------------
// getPaymentItems
// ---------------------------------------------------------------------------

export async function getPaymentItems(orgId: string): Promise<PaymentItemRow[]> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) throw new Error("Unauthorized");

  await requireRole(orgId, userId, "guardian");

  const rows = await db
    .select()
    .from(paymentItems)
    .where(eq(paymentItems.organizationId, orgId))
    .orderBy(sql`${paymentItems.createdAt} desc`);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    amount: r.amount,
    currency: r.currency,
    paymentType: r.paymentType,
    isActive: r.isActive,
    createdAt: r.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// getPayments
// ---------------------------------------------------------------------------

export async function getPayments(orgId: string): Promise<PaymentRow[]> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) throw new Error("Unauthorized");

  await requireRole(orgId, userId, "guardian");

  const rows = await db
    .select({
      id: payments.id,
      paymentItemTitle: paymentItems.title,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      payerName: payments.payerName,
      payerEmail: payments.payerEmail,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .innerJoin(paymentItems, eq(payments.paymentItemId, paymentItems.id))
    .where(eq(payments.organizationId, orgId))
    .orderBy(sql`${payments.createdAt} desc`);

  return rows;
}

// ---------------------------------------------------------------------------
// createCheckoutSession — admin-initiated, returns Stripe URL
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
  orgId: string,
  paymentItemId: string,
): Promise<CreateCheckoutResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  const [item] = await db
    .select()
    .from(paymentItems)
    .where(
      and(
        eq(paymentItems.id, paymentItemId),
        eq(paymentItems.organizationId, orgId),
      ),
    );

  if (!item) {
    return { success: false, error: "Payment item not found" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: item.currency,
          product_data: {
            name: item.title,
            description: item.description ?? undefined,
          },
          unit_amount: item.amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      organizationId: orgId,
      paymentItemId: item.id,
    },
    success_url: `${baseUrl}/dashboard/${orgId}/payments?success=true`,
    cancel_url: `${baseUrl}/dashboard/${orgId}/payments?cancelled=true`,
  });

  if (!session.url) {
    return { success: false, error: "Failed to create checkout session" };
  }

  return { success: true, url: session.url };
}
