"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { guardians, organizations, playerGuardians, players } from "@/db/schema";
import { requireRole } from "@/lib/memberships";
import { sendEmail } from "@/lib/email";
import { buildWelcomeEmail } from "@/lib/email-templates";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
import { logger } from "@/lib/logger";

interface CreateGuardianResult {
  success: boolean;
  guardianId?: string;
  error?: string;
}

export async function createGuardian(
  orgId: string,
  formData: FormData
): Promise<CreateGuardianResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireRole(orgId, userId, "admin");

  const firstName = formData.get("firstName") as string | null;
  const lastName = formData.get("lastName") as string | null;
  const email = (formData.get("email") as string | null) || null;
  const phone = (formData.get("phone") as string | null) || null;
  const preferredContact =
    (formData.get("preferredContact") as "sms" | "email" | "both" | null) ??
    "sms";
  const playerId = (formData.get("playerId") as string | null) || null;
  const relationship =
    ((formData.get("relationship") as
      | "mother"
      | "father"
      | "guardian"
      | "grandparent"
      | "other"
      | null) ?? "guardian");

  if (!firstName || !lastName) {
    return { success: false, error: "First and last name are required" };
  }

  if (!phone && !email) {
    return { success: false, error: "Phone or email is required" };
  }

  // Verify player ownership if linking
  if (playerId) {
    const [player] = await db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.id, playerId), eq(players.organizationId, orgId)));
    if (!player) {
      return { success: false, error: "Player not found" };
    }
  }

  const [guardian] = await db
    .insert(guardians)
    .values({
      organizationId: orgId,
      firstName,
      lastName,
      email,
      phone,
      preferredContact,
    })
    .returning();

  if (playerId) {
    await db.insert(playerGuardians).values({
      playerId,
      guardianId: guardian.id,
      relationship,
      isPrimary: false,
    });
  }

  revalidatePath(`/dashboard/${orgId}/guardians`);
  revalidatePath(`/dashboard/${orgId}/players`);
  revalidatePath(`/dashboard/${orgId}`);

  // Fire welcome email non-blocking — guardian was already created
  if (guardian.email) {
    const guardianEmail = guardian.email;
    void (async () => {
      try {
        const [org] = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, orgId));

        const orgName = org?.name ?? "Your Organization";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ysoconnect.com";
        const unsubscribeUrl = buildUnsubscribeUrl(appUrl, guardian.id);

        const htmlBody = buildWelcomeEmail({
          firstName: guardian.firstName,
          orgName,
          appUrl,
          guardianId: guardian.id,
        });
        const unsubscribeHeaders = {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        };

        const result = await sendEmail(
          guardianEmail,
          `Welcome to ${orgName}!`,
          htmlBody,
          unsubscribeHeaders,
        );

        if (!result.success) {
          logger.warn("Guardian welcome email failed", {
            guardianId: guardian.id,
            orgId,
            error: result.error,
          });
        } else {
          logger.info("Guardian welcome email sent", {
            guardianId: guardian.id,
            orgId,
            emailId: result.id,
          });
        }
      } catch (err) {
        logger.error("Unexpected error sending guardian welcome email", {
          guardianId: guardian.id,
          orgId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  }

  return { success: true, guardianId: guardian.id };
}
