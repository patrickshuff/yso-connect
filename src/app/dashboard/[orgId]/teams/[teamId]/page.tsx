import { eq, and, sql, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, CalendarDays } from "lucide-react";
import { db } from "@/db";
import { teams, teamPlayers, events } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getTeam(orgId: string, teamId: string) {
  const [row] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)));
  return row ?? null;
}

async function getRosterCount(teamId: string): Promise<number> {
  const [row] = await db
    .select({ c: count(teamPlayers.id) })
    .from(teamPlayers)
    .where(eq(teamPlayers.teamId, teamId));
  return row?.c ?? 0;
}

async function getUpcomingEventCount(teamId: string): Promise<number> {
  const [row] = await db
    .select({ c: count(events.id) })
    .from(events)
    .where(
      sql`${events.teamId} = ${teamId}
        AND ${events.isCancelled} = false
        AND ${events.startTime} >= now()`,
    );
  return row?.c ?? 0;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = await params;
  const team = await getTeam(orgId, teamId);
  if (!team) notFound();

  const [rosterCount, upcomingCount] = await Promise.all([
    getRosterCount(teamId),
    getUpcomingEventCount(teamId),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            <Users className="size-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {rosterCount}
              </p>
              <p className="text-sm text-muted-foreground">
                {rosterCount === 1 ? "Player" : "Players"}
              </p>
            </div>
          </div>
          <Link href={`/dashboard/${orgId}/teams/${teamId}/players`}>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {upcomingCount}
              </p>
              <p className="text-sm text-muted-foreground">
                Upcoming {upcomingCount === 1 ? "event" : "events"}
              </p>
            </div>
          </div>
          <Link href={`/dashboard/${orgId}/teams/${teamId}/events`}>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
