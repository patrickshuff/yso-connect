import { notFound } from "next/navigation";
import { eq, and, asc, gte } from "drizzle-orm";
import type { Metadata } from "next";
import { Clock, MapPin, Shield, CalendarDays } from "lucide-react";
import { db } from "@/db";
import { organizations, events, teams } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrgHeader } from "@/components/public/org-header";
import { OrgFooter } from "@/components/public/org-footer";
import { ScheduleFilter } from "@/components/public/schedule-filter";

async function getOrgBySlug(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  return org ?? null;
}

async function getUpcomingEvents(orgId: string, teamId: string | null) {
  const now = new Date();
  const conditions = [
    eq(events.organizationId, orgId),
    eq(events.isCancelled, false),
    gte(events.startTime, now),
  ];

  if (teamId) {
    conditions.push(eq(events.teamId, teamId));
  }

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
      teamName: teams.name,
    })
    .from(events)
    .leftJoin(teams, eq(events.teamId, teams.id))
    .where(and(...conditions))
    .orderBy(asc(events.startTime));
}

async function getOrgTeams(orgId: string) {
  return db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.organizationId, orgId))
    .orderBy(asc(teams.name));
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

const EVENT_TYPE_STYLES: Record<string, string> = {
  game: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  practice: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  event: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  meeting:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

type EventRow = Awaited<ReturnType<typeof getUpcomingEvents>>[number];

function groupByDate(eventRows: EventRow[]) {
  const groups: Map<string, EventRow[]> = new Map();

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) {
    return { title: "Organization Not Found" };
  }

  return {
    title: `Schedule | ${org.name} | YSO Connect`,
    description: `View the upcoming event schedule for ${org.name}.`,
  };
}

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const { slug } = await params;
  const { team: teamFilter } = await searchParams;
  const org = await getOrgBySlug(slug);

  if (!org) {
    notFound();
  }

  const [eventRows, orgTeams] = await Promise.all([
    getUpcomingEvents(org.id, teamFilter ?? null),
    getOrgTeams(org.id),
  ]);

  const grouped = groupByDate(eventRows);

  return (
    <>
      <OrgHeader orgName={org.name} slug={slug} />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Schedule
              </h1>
              <p className="mt-1 text-muted-foreground">
                Upcoming events for {org.name}
              </p>
            </div>
            <ScheduleFilter teams={orgTeams} slug={slug} />
          </div>

          {eventRows.length === 0 ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-2 py-12">
                  <CalendarDays className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No upcoming events scheduled.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Array.from(grouped.entries()).map(([dateKey, dateEvents]) => (
                <div key={dateKey} className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {formatDate(dateEvents[0].startTime)}
                  </h2>
                  <div className="grid gap-3">
                    {dateEvents.map((event) => (
                      <Card key={event.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">
                                  {event.title}
                                </h3>
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
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3.5" />
                                  {event.isAllDay
                                    ? "All Day"
                                    : `${formatTime(event.startTime)} \u2013 ${formatTime(event.endTime)}`}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="size-3.5" />
                                    {event.location}
                                  </span>
                                )}
                                {event.teamName && (
                                  <span className="flex items-center gap-1">
                                    <Shield className="size-3.5" />
                                    {event.teamName}
                                  </span>
                                )}
                              </div>
                            </div>
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
      </main>
      <OrgFooter orgName={org.name} slug={slug} />
    </>
  );
}
