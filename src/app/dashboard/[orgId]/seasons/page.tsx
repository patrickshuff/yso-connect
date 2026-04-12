import { eq, sql, count } from "drizzle-orm";
import { Calendar } from "lucide-react";
import { db } from "@/db";
import { seasons, teams } from "@/db/schema";
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Season</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Teams</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasonRows.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">{season.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(season.startDate)} &ndash;{" "}
                      {formatDate(season.endDate)}
                    </TableCell>
                    <TableCell>
                      {season.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {season.teamCount}{" "}
                      {season.teamCount === 1 ? "team" : "teams"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
