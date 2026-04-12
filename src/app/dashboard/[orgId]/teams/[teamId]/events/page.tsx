import { eq, and, asc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { db } from "@/db";
import { events, teams } from "@/db/schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddEventDialog } from "@/components/dashboard/add-event-dialog";
import { CancelEventButton } from "@/components/dashboard/cancel-event-button";

const EVENT_TYPE_STYLES: Record<string, string> = {
  game: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  practice: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  event: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  meeting:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

async function getTeam(orgId: string, teamId: string) {
  const [row] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.organizationId, orgId)));
  return row ?? null;
}

async function getTeamEvents(orgId: string, teamId: string) {
  return db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      isAllDay: events.isAllDay,
      isCancelled: events.isCancelled,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, orgId),
        eq(events.teamId, teamId),
        sql`${events.startTime} >= now()`,
      ),
    )
    .orderBy(asc(events.startTime));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TeamEventsPage({
  params,
}: {
  params: Promise<{ orgId: string; teamId: string }>;
}) {
  const { orgId, teamId } = await params;
  const team = await getTeam(orgId, teamId);
  if (!team) notFound();

  const eventRows = await getTeamEvents(orgId, teamId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {team.name} — Events
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upcoming events for this team.
          </p>
        </div>
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
            <div className="flex flex-col items-center gap-2 py-12">
              <CalendarDays className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No upcoming events for this team.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {eventRows.map((event) => (
            <Card
              key={event.id}
              className={event.isCancelled ? "opacity-60" : undefined}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {event.title}
                      {event.isCancelled && (
                        <Badge variant="destructive">Cancelled</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={EVENT_TYPE_STYLES[event.eventType] ?? ""}
                      >
                        {event.eventType}
                      </Badge>
                    </CardDescription>
                  </div>
                  {!event.isCancelled && (
                    <CancelEventButton orgId={orgId} eventId={event.id} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {formatDate(event.startTime)} · {formatTime(event.startTime)}{" "}
                    &ndash; {formatTime(event.endTime)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {event.location}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
