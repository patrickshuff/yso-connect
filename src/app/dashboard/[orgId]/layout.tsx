import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getMembership } from "@/lib/memberships";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

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

  return (
    <DashboardShell orgId={orgId} orgName={org.name}>
      {children}
    </DashboardShell>
  );
}
