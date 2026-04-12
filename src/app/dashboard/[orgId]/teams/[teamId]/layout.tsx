import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { teams, organizations } from "@/db/schema";
import { cn } from "@/lib/utils";

async function getTeamAndOrg(orgId: string, teamId: string) {
  const [row] = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      orgName: organizations.name,
    })
    .from(teams)
    .innerJoin(organizations, eq(teams.organizationId, organizations.id))
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)));
  return row ?? null;
}

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = await params;
  const row = await getTeamAndOrg(orgId, teamId);
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/dashboard/${orgId}`}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit",
          )}
        >
          <ArrowLeft className="size-4" />
          Back to {row.orgName}
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {row.teamName}
          </h2>
        </div>
      </div>
      {children}
    </div>
  );
}
