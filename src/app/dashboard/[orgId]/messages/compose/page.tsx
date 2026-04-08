import { eq, and, count } from "drizzle-orm";
import { db } from "@/db";
import { teams, guardians, teamPlayers, playerGuardians } from "@/db/schema";
import { ComposeMessageForm } from "@/components/dashboard/compose-message-form";

async function getTeamsForOrg(orgId: string) {
  return db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.organizationId, orgId))
    .orderBy(teams.name);
}

async function getOrgGuardianCount(orgId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(guardians)
    .where(eq(guardians.organizationId, orgId));
  return result?.count ?? 0;
}

async function getTeamGuardianCounts(
  orgId: string,
  teamIds: string[],
): Promise<Record<string, number>> {
  if (teamIds.length === 0) return {};

  const counts: Record<string, number> = {};

  for (const teamId of teamIds) {
    const rows = await db
      .selectDistinctOn([guardians.id], { id: guardians.id })
      .from(teamPlayers)
      .innerJoin(playerGuardians, eq(teamPlayers.playerId, playerGuardians.playerId))
      .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
      .where(
        and(
          eq(teamPlayers.teamId, teamId),
          eq(guardians.organizationId, orgId),
        ),
      );
    counts[teamId] = rows.length;
  }

  return counts;
}

export default async function ComposeMessagePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const orgTeams = await getTeamsForOrg(orgId);
  const [orgGuardianCount, teamCounts] = await Promise.all([
    getOrgGuardianCount(orgId),
    getTeamGuardianCounts(orgId, orgTeams.map((t) => t.id)),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Compose Message
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a message to guardians via SMS, email, or both.
        </p>
      </div>

      <ComposeMessageForm
        orgId={orgId}
        teams={orgTeams}
        recipientCounts={{
          organization: orgGuardianCount,
          teams: teamCounts,
        }}
      />
    </div>
  );
}
