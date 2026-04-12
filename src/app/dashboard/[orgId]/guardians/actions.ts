"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  guardians,
  organizations,
  playerGuardians,
  players,
  teamPlayers,
  teams,
} from "@/db/schema";
import { requireRole } from "@/lib/memberships";
import { sendEmail } from "@/lib/email";
import { buildGuardianConfirmationEmail } from "@/lib/email-templates";
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

  revalidatePath(`/dashboard/${orgId}`, "layout");

  // Fire confirmation email non-blocking — guardian was already created.
  // We only send a confirmation email when we have player + team context,
  // so the opt-in message can name the child and team.
  if (guardian.email && playerId) {
    const guardianEmail = guardian.email;
    const linkedPlayerId = playerId;
    void (async () => {
      try {
        const [org] = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, orgId));

        const [playerInfo] = await db
          .select({
            playerFirstName: players.firstName,
            playerLastName: players.lastName,
            teamName: teams.name,
          })
          .from(players)
          .leftJoin(teamPlayers, eq(teamPlayers.playerId, players.id))
          .leftJoin(teams, eq(teamPlayers.teamId, teams.id))
          .where(eq(players.id, linkedPlayerId))
          .limit(1);

        if (!playerInfo || !playerInfo.teamName) {
          logger.warn(
            "Skipping guardian confirmation email — no team linked to player",
            { guardianId: guardian.id, orgId, playerId: linkedPlayerId },
          );
          return;
        }

        const orgName = org?.name ?? "Your Organization";
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ysoconnect.com";
        const unsubscribeUrl = buildUnsubscribeUrl(appUrl, guardian.id);
        const playerName =
          `${playerInfo.playerFirstName} ${playerInfo.playerLastName}`.trim();

        const htmlBody = buildGuardianConfirmationEmail({
          firstName: guardian.firstName,
          playerName,
          teamName: playerInfo.teamName,
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
          `Confirm you'd like updates about ${playerName}`,
          htmlBody,
          unsubscribeHeaders,
        );

        if (!result.success) {
          logger.warn("Guardian confirmation email failed", {
            guardianId: guardian.id,
            orgId,
            error: result.error,
          });
        } else {
          logger.info("Guardian confirmation email sent", {
            guardianId: guardian.id,
            orgId,
            emailId: result.id,
          });
        }
      } catch (err) {
        logger.error("Unexpected error sending guardian confirmation email", {
          guardianId: guardian.id,
          orgId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  } else if (guardian.email && !playerId) {
    logger.warn(
      "Guardian created with email but no player — skipping confirmation email",
      { guardianId: guardian.id, orgId },
    );
  }

  return { success: true, guardianId: guardian.id };
}

interface UpdateGuardianResult {
  success: boolean;
  error?: string;
}

export async function updateGuardian(
  orgId: string,
  guardianId: string,
  formData: FormData,
): Promise<UpdateGuardianResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  const [existing] = await db
    .select({ id: guardians.id })
    .from(guardians)
    .where(and(eq(guardians.id, guardianId), eq(guardians.organizationId, orgId)));
  if (!existing) return { success: false, error: "Guardian not found" };

  const firstName = formData.get("firstName") as string | null;
  const lastName = formData.get("lastName") as string | null;
  const email = (formData.get("email") as string | null) || null;
  const phone = (formData.get("phone") as string | null) || null;
  const playerGuardianId =
    (formData.get("playerGuardianId") as string | null) || null;
  const relationship = formData.get("relationship") as
    | "mother"
    | "father"
    | "guardian"
    | "grandparent"
    | "other"
    | null;

  if (!firstName || !lastName) {
    return { success: false, error: "First and last name are required" };
  }
  if (!phone && !email) {
    return { success: false, error: "Phone or email is required" };
  }

  await db
    .update(guardians)
    .set({ firstName, lastName, email, phone })
    .where(eq(guardians.id, guardianId));

  if (playerGuardianId && relationship) {
    await db
      .update(playerGuardians)
      .set({ relationship })
      .where(eq(playerGuardians.id, playerGuardianId));
  }

  revalidatePath(`/dashboard/${orgId}`, "layout");
  return { success: true };
}

export async function removeGuardianFromPlayer(
  orgId: string,
  playerGuardianId: string,
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return { success: false, error: "Unauthorized" };

  await requireRole(orgId, userId, "admin");

  // Verify the link belongs to a player in this org
  const [link] = await db
    .select({ id: playerGuardians.id })
    .from(playerGuardians)
    .innerJoin(players, eq(playerGuardians.playerId, players.id))
    .where(
      and(
        eq(playerGuardians.id, playerGuardianId),
        eq(players.organizationId, orgId),
      ),
    );
  if (!link) return { success: false, error: "Link not found" };

  await db.delete(playerGuardians).where(eq(playerGuardians.id, playerGuardianId));

  revalidatePath(`/dashboard/${orgId}`, "layout");
  return { success: true };
}
