import { eq, count, sql } from "drizzle-orm";
import { Shield } from "lucide-react";
import { db } from "@/db";
import { teams, teamPlayers, seasons } from "@/db/schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddTeamDialog } from "@/components/dashboard/add-team-dialog";

async function getTeamsWithPlayerCount(orgId: string) {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      seasonName: seasons.name,
      playerCount: count(teamPlayers.id),
    })
    .from(teams)
    .innerJoin(seasons, eq(teams.seasonId, seasons.id))
    .leftJoin(teamPlayers, eq(teams.id, teamPlayers.teamId))
    .where(eq(teams.organizationId, orgId))
    .groupBy(teams.id, seasons.name)
    .orderBy(sql`${teams.name} asc`);
}

async function getOrgSeasons(orgId: string) {
  return db
    .select({ id: seasons.id, name: seasons.name })
    .from(seasons)
    .where(eq(seasons.organizationId, orgId));
}

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [teamRows, orgSeasons] = await Promise.all([
    getTeamsWithPlayerCount(orgId),
    getOrgSeasons(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Teams
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization&apos;s teams.
          </p>
        </div>
        <AddTeamDialog orgId={orgId} seasons={orgSeasons} />
      </div>

      {teamRows.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <Shield className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No teams yet. Create your first team to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamRows.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary">{team.seasonName}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {team.playerCount}{" "}
                  {team.playerCount === 1 ? "player" : "players"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
