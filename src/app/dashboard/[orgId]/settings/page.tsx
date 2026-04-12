import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { SettingsPageContent } from "@/components/dashboard/settings-page-content";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [org] = await db
    .select({
      name: organizations.name,
      reminders24hEnabled: organizations.reminders24hEnabled,
      reminders2hEnabled: organizations.reminders2hEnabled,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    notFound();
  }

  return (
    <SettingsPageContent
      orgId={orgId}
      orgName={org.name}
      reminders24hEnabled={org.reminders24hEnabled}
      reminders2hEnabled={org.reminders2hEnabled}
    />
  );
}
