"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { requireRole } from "@/lib/memberships";

interface CreateTeamResult {
  success: boolean;
  teamId?: string;
  error?: string;
}

export async function createTeam(
  orgId: string,
  formData: FormData
): Promise<CreateTeamResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireRole(orgId, userId, "admin");

  const name = formData.get("name") as string | null;
  const seasonId = formData.get("seasonId") as string | null;

  if (!name || !seasonId) {
    return { success: false, error: "Name and season are required" };
  }

  const [team] = await db
    .insert(teams)
    .values({
      organizationId: orgId,
      name,
      seasonId,
    })
    .returning();

  revalidatePath(`/dashboard/${orgId}/teams`);
  revalidatePath(`/dashboard/${orgId}`);

  return { success: true, teamId: team.id };
}
