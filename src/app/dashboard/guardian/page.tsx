import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { guardians, organizations, playerGuardians, players } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function GuardianDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch all guardian records for this user (may belong to multiple orgs)
  const guardianRows = await db
    .select({
      guardian: guardians,
      org: organizations,
    })
    .from(guardians)
    .innerJoin(organizations, eq(guardians.organizationId, organizations.id))
    .where(eq(guardians.clerkUserId, userId));

  if (guardianRows.length === 0) {
    // Not a guardian — send to main dashboard for proper routing
    redirect("/dashboard");
  }

  // Collect all guardian IDs to fetch linked players
  const guardianIds = guardianRows.map((r) => r.guardian.id);

  const playerLinks = guardianIds.length > 0
    ? await db
        .select({
          guardianId: playerGuardians.guardianId,
          relationship: playerGuardians.relationship,
          player: players,
        })
        .from(playerGuardians)
        .innerJoin(players, eq(playerGuardians.playerId, players.id))
        .where(inArray(playerGuardians.guardianId, guardianIds))
    : [];

  // Build a map of guardianId → players for rendering
  const playersByGuardian = new Map<
    string,
    Array<{ player: typeof players.$inferSelect; relationship: string }>
  >();
  for (const link of playerLinks) {
    const existing = playersByGuardian.get(link.guardianId) ?? [];
    existing.push({ player: link.player, relationship: link.relationship });
    playersByGuardian.set(link.guardianId, existing);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Welcome to YSO Connect
      </h2>
      <p className="mb-6 text-zinc-600 dark:text-zinc-400">
        You&apos;re connected as a guardian. Your team administrators will send
        updates, schedules, and announcements directly to you.
      </p>

      <div className="flex flex-col gap-6">
        {guardianRows.map(({ guardian, org }) => {
          const linkedPlayers = playersByGuardian.get(guardian.id) ?? [];
          return (
            <Card key={guardian.id}>
              <CardHeader>
                <CardTitle>{org.name}</CardTitle>
                <CardDescription>
                  {guardian.firstName} {guardian.lastName}
                  {guardian.email && ` · ${guardian.email}`}
                  {guardian.phone && ` · ${guardian.phone}`}
                </CardDescription>
              </CardHeader>
              {linkedPlayers.length > 0 && (
                <CardContent>
                  <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Linked players
                  </p>
                  <ul className="flex flex-col gap-1">
                    {linkedPlayers.map(({ player, relationship }) => (
                      <li
                        key={player.id}
                        className="text-sm text-zinc-600 dark:text-zinc-400"
                      >
                        {player.firstName} {player.lastName}
                        <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500 capitalize">
                          ({relationship})
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
