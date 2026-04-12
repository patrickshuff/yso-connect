import { eq, count, sql } from "drizzle-orm";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { teams, teamPlayers, seasons } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default async function OrgOverviewPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const teamRows = await getTeamsWithPlayerCount(orgId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Overview
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization dashboard at a glance.
        </p>
      </div>

      {/* Teams table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Teams
          </h3>
          <Link href={`/dashboard/${orgId}/teams`}>
            <Button variant="outline" size="sm">
              <Plus className="size-4" data-icon="inline-start" />
              Add Team
            </Button>
          </Link>
        </div>
        {teamRows.length === 0 ? (
          <Card>
            <CardContent>
              <p className="py-8 text-center text-sm text-muted-foreground">
                No teams yet.{" "}
                <Link
                  href={`/dashboard/${orgId}/teams`}
                  className="underline underline-offset-2"
                >
                  Create your first team.
                </Link>
              </p>
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
                        {team.sport ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
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

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link href={`/dashboard/${orgId}/import`}>
            <Button variant="outline">
              <Upload className="size-4" data-icon="inline-start" />
              Import Roster
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
