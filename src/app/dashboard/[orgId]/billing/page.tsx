import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { BillingPageContent } from "@/components/dashboard/billing-page-content";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    notFound();
  }

  return (
    <BillingPageContent
      orgId={orgId}
      subscriptionStatus={org.subscriptionStatus}
      trialEndsAt={org.trialEndsAt?.toISOString() ?? null}
      subscriptionPaidUntil={org.subscriptionPaidUntil?.toISOString() ?? null}
      createdAt={org.createdAt.toISOString()}
    />
  );
}
