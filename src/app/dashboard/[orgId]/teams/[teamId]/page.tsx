import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, CalendarDays } from "lucide-react";
import { db } from "@/db";
import {
  teams,
  teamPlayers,
  players,
  playerGuardians,
  guardians,
  events,
} from "@/db/schema";
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
import { AddPlayerDialog } from "@/components/dashboard/add-player-dialog";
import { AddGuardianDialog } from "@/components/dashboard/add-guardian-dialog";
import { EditGuardianDialog } from "@/components/dashboard/edit-guardian-dialog";
import { AddEventDialog } from "@/components/dashboard/add-event-dialog";

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

function formatEventDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

async function getTeam(orgId: string, teamId: string) {
  const [row] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)));
  return row ?? null;
}

async function getTeamPlayers(teamId: string, orgId: string): Promise<PlayerRow[]> {
  const rows = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(teamPlayers)
    .innerJoin(players, eq(teamPlayers.playerId, players.id))
    .where(and(eq(teamPlayers.teamId, teamId), eq(players.organizationId, orgId)))
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

async function getTeamUpcomingEvents(orgId: string, teamId: string) {
  return db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, orgId),
        eq(events.teamId, teamId),
        eq(events.isCancelled, false),
        sql`${events.startTime} >= now()`,
      ),
    )
    .orderBy(asc(events.startTime));
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = await params;
  const team = await getTeam(orgId, teamId);
  if (!team) notFound();

  const [playerRows, eventRows] = await Promise.all([
    getTeamPlayers(teamId, orgId),
    getTeamUpcomingEvents(orgId, teamId),
  ]);

  return (
    <div className="space-y-8">
      {/* Players */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Players
          </h3>
          <AddPlayerDialog orgId={orgId} teamId={teamId} />
        </div>
        {playerRows.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-8">
                <Users className="size-8 text-muted-foreground" />
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
                          <Link
                            href={`/dashboard/${orgId}/teams/${teamId}/players/${player.id}`}
                            className="hover:underline underline-offset-2"
                          >
                            {playerName}
                          </Link>
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

      {/* Upcoming Events */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Upcoming Events
          </h3>
          <AddEventDialog
            orgId={orgId}
            teams={[]}
            lockedTeamId={teamId}
            lockedTeamName={team.name}
          />
        </div>
        {eventRows.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-8">
                <CalendarDays className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No upcoming events scheduled.
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
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventRows.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.eventType}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatEventDate(event.startTime)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.location ?? <span className="text-zinc-400">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
