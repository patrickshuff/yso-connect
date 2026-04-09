"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { paymentItems, organizations } from "@/db/schema";
import { stripe } from "@/lib/stripe";

interface CheckoutResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function createPublicCheckoutSession(
  slug: string,
  itemId: string,
): Promise<CheckoutResult> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (!org) {
    return { success: false, error: "Organization not found" };
  }

  const [item] = await db
    .select()
    .from(paymentItems)
    .where(
      and(
        eq(paymentItems.id, itemId),
        eq(paymentItems.organizationId, org.id),
        eq(paymentItems.isActive, true),
      ),
    );

  if (!item) {
    return { success: false, error: "Payment item not found or inactive" };
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
      organizationId: org.id,
      paymentItemId: item.id,
    },
    success_url: `${baseUrl}/o/${slug}/pay/success`,
    cancel_url: `${baseUrl}/o/${slug}/pay/${item.id}`,
  });

  if (!session.url) {
    return { success: false, error: "Failed to create checkout session" };
  }

  return { success: true, url: session.url };
}
