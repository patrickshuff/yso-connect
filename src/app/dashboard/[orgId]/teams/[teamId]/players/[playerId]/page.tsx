import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import {
  players,
  teamPlayers,
  teams,
  playerGuardians,
  guardians,
} from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerEditForm } from "@/components/dashboard/player-edit-form";
import { AddGuardianDialog } from "@/components/dashboard/add-guardian-dialog";
import { EditGuardianDialog } from "@/components/dashboard/edit-guardian-dialog";

async function getPlayerOnTeam(
  orgId: string,
  teamId: string,
  playerId: string,
) {
  const [row] = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      dateOfBirth: players.dateOfBirth,
      teamName: teams.name,
    })
    .from(players)
    .innerJoin(teamPlayers, eq(teamPlayers.playerId, players.id))
    .innerJoin(teams, eq(teamPlayers.teamId, teams.id))
    .where(
      and(
        eq(players.id, playerId),
        eq(players.organizationId, orgId),
        eq(teamPlayers.teamId, teamId),
        eq(teams.organizationId, orgId),
      ),
    );
  return row ?? null;
}

async function getPlayerGuardians(playerId: string) {
  return db
    .select({
      playerGuardianId: playerGuardians.id,
      guardianId: guardians.id,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      phone: guardians.phone,
      email: guardians.email,
      relationship: playerGuardians.relationship,
    })
    .from(playerGuardians)
    .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
    .where(eq(playerGuardians.playerId, playerId));
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string; playerId: string }>;
}) {
  const { orgId, teamId, playerId } = await params;
  const player = await getPlayerOnTeam(orgId, teamId, playerId);
  if (!player) notFound();

  const guardianRows = await getPlayerGuardians(playerId);
  const playerName = `${player.firstName} ${player.lastName}`;

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/${orgId}/teams/${teamId}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {player.teamName}
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {playerName}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player details</CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerEditForm
            orgId={orgId}
            teamId={teamId}
            playerId={playerId}
            firstName={player.firstName}
            lastName={player.lastName}
            dateOfBirth={player.dateOfBirth}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Guardians</CardTitle>
            <AddGuardianDialog
              orgId={orgId}
              playerId={playerId}
              playerName={playerName}
            />
          </div>
        </CardHeader>
        <CardContent>
          {guardianRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No guardians yet. Add one to get started.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {guardianRows.map((g) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
