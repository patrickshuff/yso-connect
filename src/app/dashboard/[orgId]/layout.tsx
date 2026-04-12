import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getMembership, getUserOrganizations } from "@/lib/memberships";
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
  // treatPendingAsSignedOut: false — new users without a Clerk org have pending
  // sessions. We manage orgs in our own DB so we only need userId.
  const { userId } = await auth({ treatPendingAsSignedOut: false });

  if (!userId) {
    // Middleware handles the primary redirect with UTM preservation.
    // This is a safety fallback.
    throw new Error("Unauthorized");
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

  const userOrgs = await getUserOrganizations(userId);
  const orgList = userOrgs.map((o) => ({ id: o.id, name: o.name }));

  // membership is fetched above to enforce access; role is not currently used
  // outside of per-action checks.
  void membership;

  return (
    <DashboardShell
      orgId={orgId}
      orgName={org.name}
      userOrgs={orgList}
    >
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
