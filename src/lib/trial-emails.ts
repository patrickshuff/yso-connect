import { and, eq, gte, lt, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { funnelEvents, organizations } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import {
  buildTrialReminder7dEmail,
  buildTrialReminder25dEmail,
} from "@/lib/email-templates";
import { logger } from "@/lib/logger";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ysoconnect.com";

export interface TrialReminderResult {
  found: number;
  sent: number;
  failed: number;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Returns org IDs that have already been sent a given trial reminder event.
 * Used to deduplicate sends across cron runs.
 */
async function getSentOrgIds(eventName: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ organizationId: funnelEvents.organizationId })
    .from(funnelEvents)
    .where(eq(funnelEvents.eventName, eventName));
  return rows
    .map((r) => r.organizationId)
    .filter((id): id is string => id !== null);
}

/**
 * Records a trial reminder send in funnel_events for dedup and attribution.
 */
async function logReminderSent(
  eventName: string,
  utmCampaign: string,
  orgId: string,
  orgSlug: string,
): Promise<void> {
  await db.insert(funnelEvents).values({
    eventName,
    organizationId: orgId,
    organizationSlug: orgSlug,
    location: "cron_trial_reminders",
    pagePath: "/api/cron/trial-reminders",
    utmSource: "email",
    utmMedium: "trial_reminder",
    utmCampaign,
  });
}

/**
 * Sends day-7 trial reminders to orgs whose trial ends in ~23 days (±1 day window).
 * Skips orgs already sent, without a contact email, or no longer on trial.
 */
export async function sendTrialReminder7d(
  now = new Date(),
): Promise<TrialReminderResult> {
  const eventName = "trial_reminder_7d_sent";
  const windowStart = addDays(now, 22);
  const windowEnd = addDays(now, 24);

  const alreadySent = await getSentOrgIds(eventName);

  const whereClause =
    alreadySent.length > 0
      ? and(
          eq(organizations.subscriptionStatus, "trial"),
          gte(organizations.trialEndsAt, windowStart),
          lt(organizations.trialEndsAt, windowEnd),
          notInArray(organizations.id, alreadySent),
        )
      : and(
          eq(organizations.subscriptionStatus, "trial"),
          gte(organizations.trialEndsAt, windowStart),
          lt(organizations.trialEndsAt, windowEnd),
        );

  const candidates = await db.select().from(organizations).where(whereClause);

  let sent = 0;
  let failed = 0;

  for (const org of candidates) {
    if (!org.contactEmail) {
      logger.warn("Skipping trial 7d reminder — no contact email", { orgId: org.id });
      continue;
    }

    const html = buildTrialReminder7dEmail({
      orgName: org.name,
      orgId: org.id,
      appUrl: APP_URL,
    });

    const result = await sendEmail(
      org.contactEmail,
      "You\u2019re one week in \u2014 here\u2019s what YSO Connect unlocks",
      html,
    );

    if (result.success) {
      await logReminderSent(eventName, "trial_7d", org.id, org.slug);
      sent++;
      logger.info("Trial 7d reminder sent", { orgId: org.id, emailId: result.id });
    } else {
      failed++;
      logger.error("Failed to send trial 7d reminder", {
        orgId: org.id,
        error: result.error,
      });
    }
  }

  return { found: candidates.length, sent, failed };
}

/**
 * Sends day-25 trial reminders to orgs whose trial ends in ~5 days (±1 day window).
 * Skips orgs already sent, without a contact email, or no longer on trial.
 */
export async function sendTrialReminder25d(
  now = new Date(),
): Promise<TrialReminderResult> {
  const eventName = "trial_reminder_25d_sent";
  const windowStart = addDays(now, 4);
  const windowEnd = addDays(now, 6);

  const alreadySent = await getSentOrgIds(eventName);

  const whereClause =
    alreadySent.length > 0
      ? and(
          eq(organizations.subscriptionStatus, "trial"),
          gte(organizations.trialEndsAt, windowStart),
          lt(organizations.trialEndsAt, windowEnd),
          notInArray(organizations.id, alreadySent),
        )
      : and(
          eq(organizations.subscriptionStatus, "trial"),
          gte(organizations.trialEndsAt, windowStart),
          lt(organizations.trialEndsAt, windowEnd),
        );

  const candidates = await db.select().from(organizations).where(whereClause);

  let sent = 0;
  let failed = 0;

  for (const org of candidates) {
    if (!org.contactEmail) {
      logger.warn("Skipping trial 25d reminder — no contact email", { orgId: org.id });
      continue;
    }

    const trialEndsAt = org.trialEndsAt ?? new Date();
    const daysRemaining = Math.max(
      Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      1,
    );

    const html = buildTrialReminder25dEmail({
      orgName: org.name,
      orgId: org.id,
      appUrl: APP_URL,
      daysRemaining,
    });

    const result = await sendEmail(
      org.contactEmail,
      `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left on your YSO Connect trial`,
      html,
    );

    if (result.success) {
      await logReminderSent(eventName, "trial_25d", org.id, org.slug);
      sent++;
      logger.info("Trial 25d reminder sent", { orgId: org.id, emailId: result.id });
    } else {
      failed++;
      logger.error("Failed to send trial 25d reminder", {
        orgId: org.id,
        error: result.error,
      });
    }
  }

  return { found: candidates.length, sent, failed };
}

/**
 * Runs both trial reminder passes. Used by the cron handler.
 */
export async function sendAllTrialReminders(now = new Date()): Promise<{
  reminder7d: TrialReminderResult;
  reminder25d: TrialReminderResult;
}> {
  const [reminder7d, reminder25d] = await Promise.all([
    sendTrialReminder7d(now),
    sendTrialReminder25d(now),
  ]);
  return { reminder7d, reminder25d };
}
