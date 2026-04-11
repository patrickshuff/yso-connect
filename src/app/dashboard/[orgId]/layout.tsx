import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getMembership } from "@/lib/memberships";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BillingGate } from "@/components/dashboard/billing-gate";

export default async function OrgDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    notFound();
  }

  const membership = await getMembership(orgId, userId);
  if (!membership) {
    notFound();
  }

  const isOwner = membership.role === "owner";

  return (
    <DashboardShell orgId={orgId} orgName={org.name} isOwner={isOwner}>
      <BillingGate
        orgId={orgId}
        subscriptionStatus={org.subscriptionStatus}
        trialEndsAt={org.trialEndsAt?.toISOString() ?? null}
        subscriptionPaidUntil={org.subscriptionPaidUntil?.toISOString() ?? null}
      >
        {children}
      </BillingGate>
    </DashboardShell>
  );
}
