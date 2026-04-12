"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { players, teamPlayers } from "@/db/schema";
import { requireRole } from "@/lib/memberships";

interface CreatePlayerResult {
  success: boolean;
  playerId?: string;
  error?: string;
}

export async function createPlayer(
  orgId: string,
  formData: FormData
): Promise<CreatePlayerResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireRole(orgId, userId, "admin");

  const firstName = formData.get("firstName") as string | null;
  const lastName = formData.get("lastName") as string | null;
  const teamId = formData.get("teamId") as string | null;

  if (!firstName || !lastName) {
    return { success: false, error: "First and last name are required" };
  }

  const [player] = await db
    .insert(players)
    .values({
      organizationId: orgId,
      firstName,
      lastName,
    })
    .returning();

  if (teamId) {
    await db.insert(teamPlayers).values({
      teamId,
      playerId: player.id,
    });
    revalidatePath(`/dashboard/${orgId}/teams/${teamId}/players`);
    revalidatePath(`/dashboard/${orgId}/teams/${teamId}`);
  }

  revalidatePath(`/dashboard/${orgId}`);

  return { success: true, playerId: player.id };
}

export async function updatePlayer(
  orgId: string,
  playerId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  const [existing] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.organizationId, orgId)));
  if (!existing) return { success: false, error: "Player not found" };

  const firstName = (formData.get("firstName") as string | null)?.trim();
  const lastName = (formData.get("lastName") as string | null)?.trim();
  const dobRaw = (formData.get("dateOfBirth") as string | null) || null;

  if (!firstName || !lastName) {
    return { success: false, error: "First and last name are required" };
  }

  await db
    .update(players)
    .set({
      firstName,
      lastName,
      dateOfBirth: dobRaw || null,
      updatedAt: new Date(),
    })
    .where(eq(players.id, playerId));

  revalidatePath(`/dashboard/${orgId}`, "layout");
  return { success: true };
}

export async function removePlayerFromTeam(
  orgId: string,
  teamId: string,
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  // Verify player is in org
  const [existing] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.organizationId, orgId)));
  if (!existing) return { success: false, error: "Player not found" };

  await db
    .delete(teamPlayers)
    .where(
      and(eq(teamPlayers.teamId, teamId), eq(teamPlayers.playerId, playerId)),
    );

  revalidatePath(`/dashboard/${orgId}`, "layout");
  return { success: true };
}
