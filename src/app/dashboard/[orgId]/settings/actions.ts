"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireRole } from "@/lib/memberships";
import { logger } from "@/lib/logger";

interface UpdateReminderSettingsResult {
  success: boolean;
  error?: string;
}

export async function updateReminderSettings(
  orgId: string,
  reminders24h: boolean,
  reminders2h: boolean,
): Promise<UpdateReminderSettingsResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireRole(orgId, userId, "admin");

  await db
    .update(organizations)
    .set({
      reminders24hEnabled: reminders24h,
      reminders2hEnabled: reminders2h,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));

  logger.info("Updated org reminder settings", {
    orgId,
    reminders24h,
    reminders2h,
  });

  revalidatePath(`/dashboard/${orgId}/settings`);

  return { success: true };
}
