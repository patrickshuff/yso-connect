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
import { AddGuardianDialog } from "@/components/dashboard/add-guardian-dialog";

interface GuardianRow {
  name: string;
  phone: string | null;
  relationship: string;
}

interface PlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  guardians: GuardianRow[];
}

function relationshipLabel(r: string): string {
  switch (r) {
    case "mother": return "Mother";
    case "father": return "Father";
    case "grandparent": return "Grandparent";
    case "guardian": return "Guardian";
    default: return "Other";
  }
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
      relationship: playerGuardians.relationship,
    })
    .from(playerGuardians)
    .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
    .where(inArray(playerGuardians.playerId, playerIds));

  const guardiansByPlayer = new Map<string, GuardianRow[]>();
  for (const link of guardianLinks) {
    const list = guardiansByPlayer.get(link.playerId) ?? [];
    list.push({
      name: `${link.firstName} ${link.lastName}`,
      phone: link.phone,
      relationship: link.relationship,
    });
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
                  <TableHead>Guardians</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerRows.map((player) => {
                  const playerName = `${player.firstName} ${player.lastName}`;
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium align-top">
                        {playerName}
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {player.guardians.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {player.guardians.map((g, i) => (
                              <span key={i}>
                                {g.name} — {relationshipLabel(g.relationship)}
                                {g.phone ? ` · ${g.phone}` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <AddGuardianDialog
                          orgId={orgId}
                          playerId={player.id}
                          playerName={playerName}
                        />
                      </TableCell>
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
