import { eq, and, inArray, asc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, CalendarX } from "lucide-react";
import { db } from "@/db";
import {
  teams,
  seasons,
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
import { Button } from "@/components/ui/button";

interface Guardian {
  name: string;
  phone: string | null;
}

interface PlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  guardians: Guardian[];
}

async function getTeam(orgId: string, teamId: string) {
  const [row] = await db
    .select({
      id: teams.id,
      name: teams.name,
      sport: teams.sport,
      seasonName: seasons.name,
    })
    .from(teams)
    .innerJoin(seasons, eq(teams.seasonId, seasons.id))
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)));
  return row ?? null;
}

async function getTeamPlayers(teamId: string, orgId: string): Promise<PlayerRow[]> {
  const teamPlayerRows = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(teamPlayers)
    .innerJoin(players, eq(teamPlayers.playerId, players.id))
    .where(and(eq(teamPlayers.teamId, teamId), eq(players.organizationId, orgId)))
    .orderBy(sql`${players.lastName} asc, ${players.firstName} asc`);

  if (teamPlayerRows.length === 0) return [];

  const playerIds = teamPlayerRows.map((p) => p.id);
  const guardianLinks = await db
    .select({
      playerId: playerGuardians.playerId,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      phone: guardians.phone,
    })
    .from(playerGuardians)
    .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
    .where(inArray(playerGuardians.playerId, playerIds));

  const guardiansByPlayer = new Map<string, Guardian[]>();
  for (const link of guardianLinks) {
    const list = guardiansByPlayer.get(link.playerId) ?? [];
    list.push({ name: `${link.firstName} ${link.lastName}`, phone: link.phone });
    guardiansByPlayer.set(link.playerId, list);
  }

  return teamPlayerRows.map((p) => ({
    ...p,
    guardians: guardiansByPlayer.get(p.id) ?? [],
  }));
}

async function getTeamEvents(teamId: string) {
  return db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      startTime: events.startTime,
      location: events.location,
    })
    .from(events)
    .where(
      sql`${events.teamId} = ${teamId}
        AND ${events.isCancelled} = false
        AND ${events.startTime} >= now()`
    )
    .orderBy(asc(events.startTime))
    .limit(10);
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

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    game: "Game",
    practice: "Practice",
    tournament: "Tournament",
    meeting: "Meeting",
  };
  return map[type] ?? type;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = await params;
  const [team, teamPlayerRows, upcomingEvents] = await Promise.all([
    getTeam(orgId, teamId),
    getTeamPlayers(teamId, orgId),
    getTeamEvents(teamId),
  ]);

  if (!team) notFound();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/${orgId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Overview
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {team.name}
          </h2>
          {team.sport && <Badge variant="secondary">{team.sport}</Badge>}
          <Badge variant="outline">{team.seasonName}</Badge>
        </div>
      </div>

      {/* Players */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Players</h3>
          <Link href={`/dashboard/${orgId}/players`}>
            <Button variant="outline" size="sm">Manage Players</Button>
          </Link>
        </div>
        {teamPlayerRows.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-10">
                <Users className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No players on this team yet.</p>
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
                    <TableHead>Guardian 1</TableHead>
                    <TableHead>Guardian 1 Phone</TableHead>
                    <TableHead>Guardian 2</TableHead>
                    <TableHead>Guardian 2 Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPlayerRows.map((player) => {
                    const g1 = player.guardians[0];
                    const g2 = player.guardians[1];
                    return (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">
                          {player.firstName} {player.lastName}
                        </TableCell>
                        <TableCell>
                          {g1?.name ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {g1?.phone ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {g2?.name ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {g2?.phone ?? <span className="text-muted-foreground">—</span>}
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
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Upcoming Events</h3>
          <Link href={`/dashboard/${orgId}/events`}>
            <Button variant="outline" size="sm">Manage Events</Button>
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-10">
                <CalendarX className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No upcoming events for this team.</p>
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
                  {upcomingEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{eventTypeLabel(event.eventType)}</Badge>
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
