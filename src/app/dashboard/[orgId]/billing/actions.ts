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
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "YSO Connect Starter Plan",
            description: "Up to 10 teams — cancel anytime",
          },
          unit_amount: 4900,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "coach_billing",
      orgId,
      userId,
    },
    subscription_data: {
      metadata: {
        orgId,
        userId,
      },
    },
    success_url: `${origin}/dashboard/${orgId}/billing?success=true`,
    cancel_url: `${origin}/dashboard/${orgId}/billing?canceled=true`,
  });

  if (!session.url) {
    return { success: false, error: "Failed to create checkout session" };
  }

  return { success: true, url: session.url };
}
