import { eq, sql } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@/db";
import { players, playerGuardians, guardians } from "@/db/schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddPlayerDialog } from "@/components/dashboard/add-player-dialog";

interface PlayerWithGuardians {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  guardianNames: string[];
}

async function getPlayersWithGuardians(
  orgId: string
): Promise<PlayerWithGuardians[]> {
  const allPlayers = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      dateOfBirth: players.dateOfBirth,
    })
    .from(players)
    .where(eq(players.organizationId, orgId))
    .orderBy(sql`${players.lastName} asc, ${players.firstName} asc`);

  if (allPlayers.length === 0) return [];

  const playerIds = allPlayers.map((p) => p.id);

  const guardianLinks = await db
    .select({
      playerId: playerGuardians.playerId,
      guardianFirstName: guardians.firstName,
      guardianLastName: guardians.lastName,
    })
    .from(playerGuardians)
    .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
    .where(sql`${playerGuardians.playerId} = ANY(${playerIds})`);

  const guardiansByPlayer = new Map<string, string[]>();
  for (const link of guardianLinks) {
    const names = guardiansByPlayer.get(link.playerId) ?? [];
    names.push(`${link.guardianFirstName} ${link.guardianLastName}`);
    guardiansByPlayer.set(link.playerId, names);
  }

  return allPlayers.map((p) => ({
    ...p,
    guardianNames: guardiansByPlayer.get(p.id) ?? [],
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playerRows.map((player) => (
            <Card key={player.id}>
              <CardHeader>
                <CardTitle>
                  {player.firstName} {player.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {player.dateOfBirth && (
                  <p className="text-sm text-muted-foreground">
                    DOB: {player.dateOfBirth}
                  </p>
                )}
                {player.guardianNames.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {player.guardianNames.map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
                {player.guardianNames.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No guardians linked
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
