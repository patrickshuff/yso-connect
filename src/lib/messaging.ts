import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  guardians,
  playerGuardians,
  teamPlayers,
  messages,
  messageDeliveries,
  communicationPreferences,
  smsConsents,
} from "@/db/schema";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type MessageChannel = "sms" | "email" | "both";
type TargetType = "team" | "organization" | "custom";

interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface GuardianWithPreferences extends Guardian {
  smsOptIn: boolean;
  emailOptIn: boolean;
}

export async function resolveRecipients(
  orgId: string,
  targetType: TargetType,
  targetId: string | null,
): Promise<Guardian[]> {
  if (targetType === "team" && targetId) {
    // team -> team_players -> player_guardians -> guardians
    const rows = await db
      .selectDistinctOn([guardians.id], {
        id: guardians.id,
        firstName: guardians.firstName,
        lastName: guardians.lastName,
        email: guardians.email,
        phone: guardians.phone,
      })
      .from(teamPlayers)
      .innerJoin(playerGuardians, eq(teamPlayers.playerId, playerGuardians.playerId))
      .innerJoin(guardians, eq(playerGuardians.guardianId, guardians.id))
      .where(
        and(
          eq(teamPlayers.teamId, targetId),
          eq(guardians.organizationId, orgId),
        ),
      );
    return rows;
  }

  // organization-wide: all guardians in org
  const rows = await db
    .select({
      id: guardians.id,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      email: guardians.email,
      phone: guardians.phone,
    })
    .from(guardians)
    .where(eq(guardians.organizationId, orgId));
  return rows;
}

async function applyPreferences(
  orgId: string,
  recipients: Guardian[],
): Promise<GuardianWithPreferences[]> {
  if (recipients.length === 0) return [];

  const prefs = await db
    .select()
    .from(communicationPreferences)
    .where(eq(communicationPreferences.organizationId, orgId));

  const prefMap = new Map(prefs.map((p) => [p.guardianId, p]));

  return recipients.map((g) => {
    const pref = prefMap.get(g.id);
    return {
      ...g,
      smsOptIn: pref?.smsOptIn ?? true,
      emailOptIn: pref?.emailOptIn ?? true,
    };
  });
}

interface SendMessageParams {
  orgId: string;
  senderId: string;
  targetType: TargetType;
  targetId: string | null;
  subject: string | null;
  body: string;
  channel: MessageChannel;
}

interface SendMessageResult {
  messageId: string;
  recipientCount: number;
  deliveryCount: number;
}

export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { orgId, senderId, targetType, targetId, subject, body, channel } = params;

  // Create message record
  const [message] = await db
    .insert(messages)
    .values({
      organizationId: orgId,
      senderId,
      subject,
      body,
      targetType,
      targetId,
      channel,
      sentAt: new Date(),
    })
    .returning();

  // Resolve and deduplicate recipients
  const rawRecipients = await resolveRecipients(orgId, targetType, targetId);
  const recipients = await applyPreferences(orgId, rawRecipients);

  // Load active SMS consents for this org to enforce TCPA
  const activeConsents = await db
    .select({ phone: smsConsents.phoneNumber, revokedAt: smsConsents.revokedAt })
    .from(smsConsents)
    .where(
      and(
        eq(smsConsents.organizationId, orgId),
        eq(smsConsents.consentGiven, true),
      ),
    );
  const consentedPhones = new Set(
    activeConsents
      .filter((c) => c.revokedAt === null)
      .map((c) => c.phone.replace(/\D/g, "")),
  );

  let deliveryCount = 0;

  for (const guardian of recipients) {
    const phoneDigits = guardian.phone?.replace(/\D/g, "") ?? "";
    const hasConsent = consentedPhones.has(phoneDigits);
    const shouldSendSMS = (channel === "sms" || channel === "both") && guardian.smsOptIn && guardian.phone && hasConsent;
    const shouldSendEmail = (channel === "email" || channel === "both") && guardian.emailOptIn && guardian.email;

    if ((channel === "sms" || channel === "both") && guardian.smsOptIn && guardian.phone && !hasConsent) {
      logger.warn("Skipping SMS - no TCPA consent", {
        guardianId: guardian.id,
        phone: guardian.phone,
      });
    }

    if (shouldSendSMS && guardian.phone) {
      const [delivery] = await db
        .insert(messageDeliveries)
        .values({
          messageId: message.id,
          guardianId: guardian.id,
          channel: "sms",
          status: "pending",
        })
        .returning();

      const result = await sendSMS(guardian.phone, body);

      await db
        .update(messageDeliveries)
        .set({
          status: result.success ? "sent" : "failed",
          externalId: result.success ? result.sid : null,
          sentAt: result.success ? new Date() : null,
        })
        .where(eq(messageDeliveries.id, delivery.id));

      deliveryCount++;
    }

    if (shouldSendEmail && guardian.email) {
      const [delivery] = await db
        .insert(messageDeliveries)
        .values({
          messageId: message.id,
          guardianId: guardian.id,
          channel: "email",
          status: "pending",
        })
        .returning();

      const htmlBody = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
${subject ? `<h2>${escapeHtml(subject)}</h2>` : ""}
<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>
</div>`;

      const result = await sendEmail(guardian.email, subject ?? "Message from your organization", htmlBody);

      await db
        .update(messageDeliveries)
        .set({
          status: result.success ? "sent" : "failed",
          externalId: result.success ? result.id : null,
          sentAt: result.success ? new Date() : null,
        })
        .where(eq(messageDeliveries.id, delivery.id));

      deliveryCount++;
    }
  }

  logger.info("Message sent", {
    messageId: message.id,
    targetType,
    targetId,
    channel,
    recipientCount: recipients.length,
    deliveryCount,
  });

  return {
    messageId: message.id,
    recipientCount: recipients.length,
    deliveryCount,
  };
}

export async function sendToTeam(
  orgId: string,
  senderId: string,
  teamId: string,
  subject: string | null,
  body: string,
  channel: MessageChannel,
): Promise<SendMessageResult> {
  return sendMessage({
    orgId,
    senderId,
    targetType: "team",
    targetId: teamId,
    subject,
    body,
    channel,
  });
}

export async function sendToOrg(
  orgId: string,
  senderId: string,
  subject: string | null,
  body: string,
  channel: MessageChannel,
): Promise<SendMessageResult> {
  return sendMessage({
    orgId,
    senderId,
    targetType: "organization",
    targetId: null,
    subject,
    body,
    channel,
  });
}
