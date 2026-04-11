import { eq, inArray, sql } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@/db";
import { players, playerGuardians, guardians } from "@/db/schema";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddPlayerDialog } from "@/components/dashboard/add-player-dialog";

interface Guardian {
  name: string;
  phone: string | null;
}

interface PlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  guardians: Guardian[];
}

async function getPlayersWithGuardians(orgId: string): Promise<PlayerRow[]> {
  const allPlayers = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(players)
    .where(eq(players.organizationId, orgId))
    .orderBy(sql`${players.lastName} asc, ${players.firstName} asc`);

  if (allPlayers.length === 0) return [];

  const playerIds = allPlayers.map((p) => p.id);

  const guardianLinks = await db
    .select({
      playerId: playerGuardians.playerId,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      phone: guardians.phone,
    })
    .from(playerGuardians)
    .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
    .where(inArray(playerGuardians.playerId, playerIds));

  const guardiansByPlayer = new Map<string, Guardian[]>();
  for (const link of guardianLinks) {
    const list = guardiansByPlayer.get(link.playerId) ?? [];
    list.push({ name: `${link.firstName} ${link.lastName}`, phone: link.phone });
    guardiansByPlayer.set(link.playerId, list);
  }

  return allPlayers.map((p) => ({
    ...p,
    guardians: guardiansByPlayer.get(p.id) ?? [],
  }));
}

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const playerRows = await getPlayersWithGuardians(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Players
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage players in your organization.
          </p>
        </div>
        <AddPlayerDialog orgId={orgId} />
      </div>

      {playerRows.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <Users className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No players yet. Add your first player to get started.
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
                  <TableHead>Player</TableHead>
                  <TableHead>Guardian 1</TableHead>
                  <TableHead>Guardian 1 Phone</TableHead>
                  <TableHead>Guardian 2</TableHead>
                  <TableHead>Guardian 2 Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerRows.map((player) => {
                  const g1 = player.guardians[0];
                  const g2 = player.guardians[1];
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        {player.firstName} {player.lastName}
                      </TableCell>
                      <TableCell>{g1?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{g1?.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{g2?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{g2?.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
