import { eq, sql, count } from "drizzle-orm";
import { Calendar } from "lucide-react";
import { db } from "@/db";
import { seasons, teams } from "@/db/schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function getSeasonsWithTeamCount(orgId: string) {
  const rows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      startDate: seasons.startDate,
      endDate: seasons.endDate,
      isActive: seasons.isActive,
      teamCount: count(teams.id),
      createdAt: seasons.createdAt,
    })
    .from(seasons)
    .leftJoin(teams, eq(seasons.id, teams.seasonId))
    .where(eq(seasons.organizationId, orgId))
    .groupBy(seasons.id)
    .orderBy(sql`${seasons.startDate} desc`);

  return rows;
}

export default async function SeasonsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const seasonRows = await getSeasonsWithTeamCount(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Seasons
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization&apos;s seasons.
          </p>
        </div>
      </div>

      {seasonRows.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <Calendar className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No seasons yet. Seasons are created during onboarding.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seasonRows.map((season) => (
            <Card key={season.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{season.name}</CardTitle>
                  {season.isActive ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <CardDescription>
                  {formatDate(season.startDate)} &ndash;{" "}
                  {formatDate(season.endDate)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {season.teamCount}{" "}
                  {season.teamCount === 1 ? "team" : "teams"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
