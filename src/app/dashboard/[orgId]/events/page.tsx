import { eq, sql, asc } from "drizzle-orm";
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

async function getEventsWithTeams(orgId: string) {
  const rows = await db
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
      teamName: teams.name,
    })
    .from(events)
    .leftJoin(teams, eq(events.teamId, teams.id))
    .where(eq(events.organizationId, orgId))
    .orderBy(asc(events.startTime));

  return rows;
}

async function getOrgTeams(orgId: string) {
  return db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.organizationId, orgId))
    .orderBy(sql`${teams.name} asc`);
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

function groupByDate(
  eventRows: Awaited<ReturnType<typeof getEventsWithTeams>>,
) {
  const groups: Map<
    string,
    Awaited<ReturnType<typeof getEventsWithTeams>>
  > = new Map();

  for (const event of eventRows) {
    const dateKey = event.startTime.toISOString().split("T")[0];
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(dateKey, [event]);
    }
  }

  return groups;
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [eventRows, orgTeams] = await Promise.all([
    getEventsWithTeams(orgId),
    getOrgTeams(orgId),
  ]);

  const now = new Date();
  const upcomingEvents = eventRows.filter((e) => e.startTime >= now);
  const grouped = groupByDate(upcomingEvents);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Events
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization&apos;s calendar and events.
          </p>
        </div>
        <AddEventDialog orgId={orgId} teams={orgTeams} />
      </div>

      {upcomingEvents.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <CalendarDays className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No upcoming events. Create your first event to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([dateKey, dateEvents]) => (
            <div key={dateKey} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {formatDate(dateEvents[0].startTime)}
              </h3>
              <div className="grid gap-3">
                {dateEvents.map((event) => (
                  <Card
                    key={event.id}
                    className={
                      event.isCancelled ? "opacity-60" : undefined
                    }
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
                              className={
                                EVENT_TYPE_STYLES[event.eventType] ?? ""
                              }
                            >
                              {event.eventType}
                            </Badge>
                            {event.teamName && (
                              <Badge variant="outline">
                                {event.teamName}
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                        {!event.isCancelled && (
                          <CancelEventButton
                            orgId={orgId}
                            eventId={event.id}
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {formatTime(event.startTime)} &ndash;{" "}
                          {formatTime(event.endTime)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
