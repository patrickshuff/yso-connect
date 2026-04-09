import { notFound } from "next/navigation";
import { eq, and, asc, gte } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  Globe,
  Shield,
  Trophy,
} from "lucide-react";
import { db } from "@/db";
import {
  organizations,
  events,
  seasons,
  sports,
  teams,
} from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrgHeader } from "@/components/public/org-header";
import { OrgFooter } from "@/components/public/org-footer";

async function getOrgBySlug(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  return org ?? null;
}

async function getUpcomingEvents(orgId: string) {
  const now = new Date();
  return db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      teamName: teams.name,
    })
    .from(events)
    .leftJoin(teams, eq(events.teamId, teams.id))
    .where(
      and(
        eq(events.organizationId, orgId),
        eq(events.isCancelled, false),
        gte(events.startTime, now),
      ),
    )
    .orderBy(asc(events.startTime))
    .limit(5);
}

async function getActiveSeasons(orgId: string) {
  return db
    .select({
      id: seasons.id,
      name: seasons.name,
      startDate: seasons.startDate,
      endDate: seasons.endDate,
    })
    .from(seasons)
    .where(and(eq(seasons.organizationId, orgId), eq(seasons.isActive, true)))
    .orderBy(asc(seasons.startDate));
}

async function getOrgSports(orgId: string) {
  return db
    .select({ id: sports.id, name: sports.name })
    .from(sports)
    .where(eq(sports.organizationId, orgId))
    .orderBy(asc(sports.name));
}

async function getOrgTeams(orgId: string) {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      seasonName: seasons.name,
    })
    .from(teams)
    .innerJoin(seasons, eq(teams.seasonId, seasons.id))
    .where(
      and(eq(teams.organizationId, orgId), eq(seasons.isActive, true)),
    )
    .orderBy(asc(teams.name));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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
    title: `${org.name} | YSO Connect`,
    description:
      org.description ??
      `${org.name} youth sports organization on YSO Connect`,
  };
}

export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) {
    notFound();
  }

  const [upcomingEvents, activeSeasons, orgSports, orgTeams] =
    await Promise.all([
      getUpcomingEvents(org.id),
      getActiveSeasons(org.id),
      getOrgSports(org.id),
      getOrgTeams(org.id),
    ]);

  return (
    <>
      <OrgHeader orgName={org.name} slug={slug} />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="text-center">
              {org.logoUrl && (
                <Image
                  src={org.logoUrl}
                  alt={`${org.name} logo`}
                  width={80}
                  height={80}
                  className="mx-auto mb-6 rounded-xl object-contain"
                />
              )}
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {org.name}
              </h1>
              {org.description && (
                <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                  {org.description}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                {org.contactEmail && (
                  <a
                    href={`mailto:${org.contactEmail}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <Mail className="size-4" />
                    {org.contactEmail}
                  </a>
                )}
                {org.contactPhone && (
                  <a
                    href={`tel:${org.contactPhone}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <Phone className="size-4" />
                    {org.contactPhone}
                  </a>
                )}
                {org.websiteUrl && (
                  <a
                    href={org.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <Globe className="size-4" />
                    Website
                  </a>
                )}
              </div>
              <div className="mt-8 flex justify-center gap-3">
                <Button render={<Link href={`/o/${slug}/signup`} />} size="lg">
                  Join This Organization
                </Button>
                <Button
                  render={<Link href={`/o/${slug}/schedule`} />}
                  variant="outline"
                  size="lg"
                >
                  View Schedule
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Main content */}
            <div className="space-y-12 lg:col-span-2">
              {/* Upcoming events */}
              <section>
                <h2 className="mb-4 text-2xl font-bold text-foreground">
                  Upcoming Events
                </h2>
                {upcomingEvents.length === 0 ? (
                  <Card>
                    <CardContent>
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No upcoming events scheduled.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <Card key={event.id}>
                        <CardContent className="flex items-start gap-4 py-4">
                          <div className="flex flex-col items-center rounded-lg bg-muted px-3 py-2 text-center">
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              {event.startTime.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-xl font-bold text-foreground">
                              {event.startTime.getDate()}
                            </span>
                          </div>
                          <div className="flex-1 space-y-1">
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
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
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
                              {event.teamName && (
                                <span className="flex items-center gap-1">
                                  <Shield className="size-3.5" />
                                  {event.teamName}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <div className="pt-2 text-center">
                      <Button
                        render={<Link href={`/o/${slug}/schedule`} />}
                        variant="outline"
                        size="sm"
                      >
                        View Full Schedule
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Teams */}
              {orgTeams.length > 0 && (
                <section>
                  <h2 className="mb-4 text-2xl font-bold text-foreground">
                    Teams
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {orgTeams.map((team) => (
                      <Card key={team.id}>
                        <CardContent className="flex items-center gap-3 py-4">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                            <Shield className="size-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {team.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {team.seasonName}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Active seasons */}
              {activeSeasons.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="size-5" />
                      Active Seasons
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activeSeasons.map((season) => (
                      <div
                        key={season.id}
                        className="rounded-lg border border-border/60 p-3"
                      >
                        <p className="font-medium text-foreground">
                          {season.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(new Date(season.startDate))} &ndash;{" "}
                          {formatDate(new Date(season.endDate))}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Sports offered */}
              {orgSports.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="size-5" />
                      Sports Offered
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {orgSports.map((sport) => (
                        <Badge key={sport.id} variant="secondary">
                          {sport.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CTA */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="space-y-4 py-6 text-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    Interested in joining?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Fill out our interest form and we will get back to you.
                  </p>
                  <Button
                    render={<Link href={`/o/${slug}/signup`} />}
                    className="w-full"
                  >
                    Sign Up
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <OrgFooter orgName={org.name} slug={slug} />
    </>
  );
}
