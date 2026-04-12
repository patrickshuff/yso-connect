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

export async function renameOrganization(
  orgId: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Name is required" };
  if (trimmed.length > 255) return { success: false, error: "Name too long" };

  await db
    .update(organizations)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  logger.info("Renamed organization", { orgId, name: trimmed });

  revalidatePath(`/dashboard/${orgId}`, "layout");
  return { success: true };
}
