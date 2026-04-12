import { eq, count, sql } from "drizzle-orm";
import { Shield } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { teams, teamPlayers, seasons } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddTeamDialog } from "@/components/dashboard/add-team-dialog";

async function getTeamsWithPlayerCount(orgId: string) {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      sport: teams.sport,
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Players</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamRows.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/${orgId}/teams/${team.id}`}
                        className="hover:underline underline-offset-2"
                      >
                        {team.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{team.seasonName}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.sport ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.playerCount}{" "}
                      {team.playerCount === 1 ? "player" : "players"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
