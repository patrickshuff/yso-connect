import { eq, and, inArray, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { db } from "@/db";
import {
  teams,
  teamPlayers,
  players,
  playerGuardians,
  guardians,
} from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddPlayerDialog } from "@/components/dashboard/add-player-dialog";
import { AddGuardianDialog } from "@/components/dashboard/add-guardian-dialog";
import { EditGuardianDialog } from "@/components/dashboard/edit-guardian-dialog";

interface GuardianRow {
  guardianId: string;
  playerGuardianId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  relationship: string;
}

interface PlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  guardians: GuardianRow[];
}

async function getTeam(orgId: string, teamId: string) {
  const [row] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)));
  return row ?? null;
}

async function getTeamPlayers(
  teamId: string,
  orgId: string,
): Promise<PlayerRow[]> {
  const rows = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(teamPlayers)
    .innerJoin(players, eq(teamPlayers.playerId, players.id))
    .where(
      and(eq(teamPlayers.teamId, teamId), eq(players.organizationId, orgId)),
    )
    .orderBy(sql`${players.lastName} asc, ${players.firstName} asc`);

  if (rows.length === 0) return [];

  const playerIds = rows.map((p) => p.id);
  const guardianLinks = await db
    .select({
      playerGuardianId: playerGuardians.id,
      guardianId: guardians.id,
      playerId: playerGuardians.playerId,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      phone: guardians.phone,
      email: guardians.email,
      relationship: playerGuardians.relationship,
    })
    .from(playerGuardians)
    .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
    .where(inArray(playerGuardians.playerId, playerIds));

  const byPlayer = new Map<string, GuardianRow[]>();
  for (const link of guardianLinks) {
    const list = byPlayer.get(link.playerId) ?? [];
    list.push({
      guardianId: link.guardianId,
      playerGuardianId: link.playerGuardianId,
      firstName: link.firstName,
      lastName: link.lastName,
      phone: link.phone,
      email: link.email,
      relationship: link.relationship,
    });
    byPlayer.set(link.playerId, list);
  }

  return rows.map((p) => ({ ...p, guardians: byPlayer.get(p.id) ?? [] }));
}

export default async function TeamPlayersPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = await params;
  const team = await getTeam(orgId, teamId);
  if (!team) notFound();

  const playerRows = await getTeamPlayers(teamId, orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {team.name} — Players
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Players on this team and their guardians.
          </p>
        </div>
        <AddPlayerDialog orgId={orgId} teamId={teamId} />
      </div>

      {playerRows.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <Users className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No players on this team yet.
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
                  <TableHead>Player</TableHead>
                  <TableHead>Guardians</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerRows.map((player) => {
                  const playerName = `${player.firstName} ${player.lastName}`;
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium align-top">
                        {playerName}
                      </TableCell>
                      <TableCell className="align-top">
                        {player.guardians.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {player.guardians.map((g) => (
                              <EditGuardianDialog
                                key={g.playerGuardianId}
                                orgId={orgId}
                                guardianId={g.guardianId}
                                playerGuardianId={g.playerGuardianId}
                                firstName={g.firstName}
                                lastName={g.lastName}
                                phone={g.phone}
                                email={g.email}
                                relationship={g.relationship}
                              />
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <AddGuardianDialog
                          orgId={orgId}
                          playerId={player.id}
                          playerName={playerName}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
