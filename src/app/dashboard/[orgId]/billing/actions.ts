"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";

interface CheckoutResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function createCoachCheckoutSession(
  orgId: string,
): Promise<CheckoutResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const stripe = getStripe();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "YSO Connect Coach Plan",
            description: "6 months of full dashboard access",
          },
          unit_amount: 1000,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "coach_billing",
      orgId,
      userId,
    },
    success_url: `${origin}/dashboard/${orgId}/billing?success=true`,
    cancel_url: `${origin}/dashboard/${orgId}/billing?canceled=true`,
  });

  if (!session.url) {
    return { success: false, error: "Failed to create checkout session" };
  }

  return { success: true, url: session.url };
}
