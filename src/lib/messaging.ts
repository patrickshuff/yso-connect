import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  guardians,
  organizations,
  playerGuardians,
  teamPlayers,
  teams,
  messages,
  messageDeliveries,
  communicationPreferences,
  smsConsents,
} from "@/db/schema";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { buildBroadcastEmail } from "@/lib/email-templates";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
import { logger } from "@/lib/logger";

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

interface DeliveryStats {
  attempted: number;
  sent: number;
  failed: number;
}

interface RecipientProcessingResult {
  attempts: number;
  sms: DeliveryStats;
  email: DeliveryStats;
  skippedSmsNoConsent: number;
}

const DEFAULT_DELIVERY_CONCURRENCY = 20;

function getDeliveryConcurrency(): number {
  const raw = process.env.MESSAGE_DELIVERY_CONCURRENCY;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_DELIVERY_CONCURRENCY;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_DELIVERY_CONCURRENCY;
  }
  return Math.min(parsed, 100);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<R>(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: safeConcurrency }, async () => {
      while (true) {
        const current = cursor;
        cursor += 1;
        if (current >= items.length) return;
        results[current] = await worker(items[current], current);
      }
    }),
  );

  return results;
}

async function createPendingDelivery(
  messageId: string,
  guardianId: string,
  channel: "sms" | "email",
): Promise<string> {
  const [delivery] = await db
    .insert(messageDeliveries)
    .values({
      messageId,
      guardianId,
      channel,
      status: "pending",
    })
    .returning({ id: messageDeliveries.id });

  return delivery.id;
}

async function finalizeDelivery(
  deliveryId: string,
  status: "sent" | "failed",
  externalId: string | null,
): Promise<void> {
  await db
    .update(messageDeliveries)
    .set({
      status,
      externalId,
      sentAt: status === "sent" ? new Date() : null,
    })
    .where(eq(messageDeliveries.id, deliveryId));
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

  const recipientIds = recipients.map((recipient) => recipient.id);
  const prefs = await db
    .select()
    .from(communicationPreferences)
    .where(
      and(
        eq(communicationPreferences.organizationId, orgId),
        inArray(communicationPreferences.guardianId, recipientIds),
      ),
    );

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
  const startedAt = Date.now();

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

  // Fetch org name as fallback label, and team name if targeting a team.
  // Guardians typically only recognize the team, not the org, so we prefer
  // the team name in email headers/footers when available.
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  const orgName = org?.name ?? "Your Organization";

  let senderLabel = orgName;
  if (targetType === "team" && targetId) {
    const [team] = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, targetId));
    if (team?.name) senderLabel = team.name;
  }

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ysoconnect.com";
  const deliveryConcurrency = getDeliveryConcurrency();
  const channelAllowsSms = channel === "sms" || channel === "both";
  const channelAllowsEmail = channel === "email" || channel === "both";

  const perRecipientResults = await mapWithConcurrency(
    recipients,
    deliveryConcurrency,
    async (guardian): Promise<RecipientProcessingResult> => {
      const sms: DeliveryStats = { attempted: 0, sent: 0, failed: 0 };
      const email: DeliveryStats = { attempted: 0, sent: 0, failed: 0 };
      let attempts = 0;
      let skippedSmsNoConsent = 0;

      const phoneDigits = guardian.phone?.replace(/\D/g, "") ?? "";
      const hasConsent = consentedPhones.has(phoneDigits);
      const shouldSendSMS = channelAllowsSms && guardian.smsOptIn && guardian.phone && hasConsent;
      const shouldSendEmail = channelAllowsEmail && guardian.emailOptIn && guardian.email;

      if (channelAllowsSms && guardian.smsOptIn && guardian.phone && !hasConsent) {
        skippedSmsNoConsent = 1;
        logger.warn("Skipping SMS - no TCPA consent", {
          messageId: message.id,
          guardianId: guardian.id,
          phone: guardian.phone,
        });
      }

      if (shouldSendSMS && guardian.phone) {
        sms.attempted += 1;
        attempts += 1;

        const deliveryId = await createPendingDelivery(message.id, guardian.id, "sms");
        const result = await sendSMS(guardian.phone, body);

        if (result.success) {
          sms.sent += 1;
          await finalizeDelivery(deliveryId, "sent", result.sid);
        } else {
          sms.failed += 1;
          await finalizeDelivery(deliveryId, "failed", null);
        }
      }

      if (shouldSendEmail && guardian.email) {
        email.attempted += 1;
        attempts += 1;

        const deliveryId = await createPendingDelivery(message.id, guardian.id, "email");
        const unsubscribeUrl = buildUnsubscribeUrl(appUrl, guardian.id);
        const htmlBody = buildBroadcastEmail({
          orgName: senderLabel,
          subject,
          body,
          appUrl,
          guardianId: guardian.id,
        });

        const result = await sendEmail(
          guardian.email,
          subject ?? `Message from ${senderLabel}`,
          htmlBody,
          {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        );

        if (result.success) {
          email.sent += 1;
          await finalizeDelivery(deliveryId, "sent", result.id);
        } else {
          email.failed += 1;
          await finalizeDelivery(deliveryId, "failed", null);
        }
      }

      return {
        attempts,
        sms,
        email,
        skippedSmsNoConsent,
      };
    },
  );

  const summary = perRecipientResults.reduce(
    (acc, result) => {
      acc.deliveryCount += result.attempts;
      acc.sms.attempted += result.sms.attempted;
      acc.sms.sent += result.sms.sent;
      acc.sms.failed += result.sms.failed;
      acc.email.attempted += result.email.attempted;
      acc.email.sent += result.email.sent;
      acc.email.failed += result.email.failed;
      acc.skippedSmsNoConsent += result.skippedSmsNoConsent;
      return acc;
    },
    {
      deliveryCount: 0,
      sms: { attempted: 0, sent: 0, failed: 0 },
      email: { attempted: 0, sent: 0, failed: 0 },
      skippedSmsNoConsent: 0,
    },
  );

  const durationMs = Date.now() - startedAt;

  logger.info("Message sent", {
    messageId: message.id,
    targetType,
    targetId,
    channel,
    deliveryConcurrency,
    durationMs,
    recipientCount: recipients.length,
    deliveryCount: summary.deliveryCount,
    smsAttempted: summary.sms.attempted,
    smsSent: summary.sms.sent,
    smsFailed: summary.sms.failed,
    emailAttempted: summary.email.attempted,
    emailSent: summary.email.sent,
    emailFailed: summary.email.failed,
    skippedSmsNoConsent: summary.skippedSmsNoConsent,
  });

  return {
    messageId: message.id,
    recipientCount: recipients.length,
    deliveryCount: summary.deliveryCount,
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
