import { eq, count } from "drizzle-orm";
import { Shield, Users, UserCheck, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { teams, players, guardians } from "@/db/schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getOrgStats(orgId: string) {
  const [[teamResult], [playerResult], [guardianResult]] = await Promise.all([
    db
      .select({ value: count() })
      .from(teams)
      .where(eq(teams.organizationId, orgId)),
    db
      .select({ value: count() })
      .from(players)
      .where(eq(players.organizationId, orgId)),
    db
      .select({ value: count() })
      .from(guardians)
      .where(eq(guardians.organizationId, orgId)),
  ]);

  return {
    teamCount: teamResult.value,
    playerCount: playerResult.value,
    guardianCount: guardianResult.value,
  };
}

export default async function OrgOverviewPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const stats = await getOrgStats(orgId);

  const statCards = [
    {
      label: "Teams",
      value: stats.teamCount,
      icon: Shield,
      href: `/dashboard/${orgId}/teams`,
    },
    {
      label: "Players",
      value: stats.playerCount,
      icon: Users,
      href: `/dashboard/${orgId}/players`,
    },
    {
      label: "Guardians",
      value: stats.guardianCount,
      icon: UserCheck,
      href: `/dashboard/${orgId}/guardians`,
    },
  ];

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

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <stat.icon className="size-4" />
                  {stat.label}
                </CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link href={`/dashboard/${orgId}/teams`}>
            <Button variant="outline">
              <Plus className="size-4" data-icon="inline-start" />
              Add Team
            </Button>
          </Link>
          <Link href={`/dashboard/${orgId}/players`}>
            <Button variant="outline">
              <Plus className="size-4" data-icon="inline-start" />
              Add Player
            </Button>
          </Link>
          <Button variant="outline" disabled>
            <Upload className="size-4" data-icon="inline-start" />
            Import Roster
          </Button>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Recent Activity
        </h3>
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              No recent activity to display.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
