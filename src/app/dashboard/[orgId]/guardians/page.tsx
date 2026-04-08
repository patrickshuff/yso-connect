import { eq, sql } from "drizzle-orm";
import { UserCheck, Mail, Phone } from "lucide-react";
import { db } from "@/db";
import { guardians, playerGuardians, players } from "@/db/schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddGuardianDialog } from "@/components/dashboard/add-guardian-dialog";

interface GuardianWithPlayers {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  preferredContact: "sms" | "email" | "both";
  playerNames: string[];
}

async function getGuardiansWithPlayers(
  orgId: string
): Promise<GuardianWithPlayers[]> {
  const allGuardians = await db
    .select({
      id: guardians.id,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      email: guardians.email,
      phone: guardians.phone,
      preferredContact: guardians.preferredContact,
    })
    .from(guardians)
    .where(eq(guardians.organizationId, orgId))
    .orderBy(sql`${guardians.lastName} asc, ${guardians.firstName} asc`);

  if (allGuardians.length === 0) return [];

  const guardianIds = allGuardians.map((g) => g.id);

  const playerLinks = await db
    .select({
      guardianId: playerGuardians.guardianId,
      playerFirstName: players.firstName,
      playerLastName: players.lastName,
    })
    .from(playerGuardians)
    .innerJoin(players, eq(playerGuardians.playerId, players.id))
    .where(sql`${playerGuardians.guardianId} = ANY(${guardianIds})`);

  const playersByGuardian = new Map<string, string[]>();
  for (const link of playerLinks) {
    const names = playersByGuardian.get(link.guardianId) ?? [];
    names.push(`${link.playerFirstName} ${link.playerLastName}`);
    playersByGuardian.set(link.guardianId, names);
  }

  return allGuardians.map((g) => ({
    ...g,
    playerNames: playersByGuardian.get(g.id) ?? [],
  }));
}

export default async function GuardiansPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const guardianRows = await getGuardiansWithPlayers(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Guardians
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage guardians and their contact information.
          </p>
        </div>
        <AddGuardianDialog orgId={orgId} />
      </div>

      {guardianRows.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12">
              <UserCheck className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No guardians yet. Add a guardian to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guardianRows.map((guardian) => (
            <Card key={guardian.id}>
              <CardHeader>
                <CardTitle>
                  {guardian.firstName} {guardian.lastName}
                </CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="capitalize">
                    {guardian.preferredContact === "both"
                      ? "SMS & Email"
                      : guardian.preferredContact.toUpperCase()}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {guardian.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-3.5" />
                    {guardian.email}
                  </div>
                )}
                {guardian.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3.5" />
                    {guardian.phone}
                  </div>
                )}
                {guardian.playerNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {guardian.playerNames.map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
                {guardian.playerNames.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No players linked
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
