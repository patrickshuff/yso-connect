import { eq, count, sql, and, asc } from "drizzle-orm";
import { CalendarX } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { teams, teamPlayers, seasons, events } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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

async function getUpcomingEvents(orgId: string) {
  return db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      startTime: events.startTime,
      location: events.location,
      teamId: events.teamId,
      teamName: teams.name,
    })
    .from(events)
    .leftJoin(teams, eq(events.teamId, teams.id))
    .where(
      and(
        eq(events.organizationId, orgId),
        eq(events.isCancelled, false),
        sql`${events.startTime} >= now()`,
      ),
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

export default async function OrgOverviewPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [teamRows, upcomingEvents] = await Promise.all([
    getTeamsWithPlayerCount(orgId),
    getUpcomingEvents(orgId),
  ]);

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

      {/* Upcoming Events */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Upcoming Events
          </h3>
        </div>
        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-8">
                <CalendarX className="size-8 text-muted-foreground" />
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
                    <TableHead>Team</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.eventType}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.teamId && event.teamName ? (
                          <Link
                            href={`/dashboard/${orgId}/teams/${event.teamId}`}
                            className="hover:underline underline-offset-2"
                          >
                            {event.teamName}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
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
