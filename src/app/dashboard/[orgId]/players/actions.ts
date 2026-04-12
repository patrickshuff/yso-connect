"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { players } from "@/db/schema";
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

  revalidatePath(`/dashboard/${orgId}/players`);
  revalidatePath(`/dashboard/${orgId}`);

  return { success: true, playerId: player.id };
}
