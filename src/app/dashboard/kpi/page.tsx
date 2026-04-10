import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getUserOrganizations } from "@/lib/memberships";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getCurrentLeadChannelBreakdown,
  getWeeklyKpiMetrics,
} from "@/lib/analytics-kpi";

function formatDelta(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? "0%" : "+100%";
  }

  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default async function KpiDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // KPI dashboard shows platform-wide metrics — restrict to org owners
  const userOrgs = await getUserOrganizations(userId);
  const isOwner = userOrgs.some((org) => org.role === "owner");
  if (!isOwner) {
    notFound();
  }

  const [metrics, channels] = await Promise.all([
    getWeeklyKpiMetrics(),
    getCurrentLeadChannelBreakdown(),
  ]);

  const cards = [
    {
      label: "Landing CTA Clicks",
      current: metrics.current.landingCtaClicks,
      previous: metrics.previous.landingCtaClicks,
    },
    {
      label: "Signup Page Views",
      current: metrics.current.signupPageViews,
      previous: metrics.previous.signupPageViews,
    },
    {
      label: "Signup Submissions",
      current: metrics.current.signupSubmissions,
      previous: metrics.previous.signupSubmissions,
    },
    {
      label: "Org Activations",
      current: metrics.current.orgActivations,
      previous: metrics.previous.orgActivations,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Weekly KPI Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Funnel performance for the last 7 days compared to the previous 7
            days.
          </p>
        </div>
        <Button render={<Link href="/api/analytics/kpi-export" />} variant="outline">
          <Download className="size-4" data-icon="inline-start" />
          Export Weekly CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.current}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {formatDelta(card.current, card.previous)} vs prior 7 days
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Funnel Conversion</CardTitle>
            <CardDescription>Current 7-day window conversion rates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">CTA to Signup View</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatRate(
                  metrics.current.signupPageViews,
                  metrics.current.landingCtaClicks,
                )}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Signup View to Submission</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatRate(
                  metrics.current.signupSubmissions,
                  metrics.current.signupPageViews,
                )}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Submission to Activation</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatRate(
                  metrics.current.orgActivations,
                  metrics.current.signupSubmissions,
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Attribution</CardTitle>
            <CardDescription>Top source / medium pairs this week.</CardDescription>
          </CardHeader>
          <CardContent>
            {channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attributed leads captured this week.
              </p>
            ) : (
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div
                    key={`${channel.source}-${channel.medium}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{channel.source}</p>
                      <p className="text-xs text-muted-foreground">{channel.medium}</p>
                    </div>
                    <p className="text-sm font-semibold">{channel.leads}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
