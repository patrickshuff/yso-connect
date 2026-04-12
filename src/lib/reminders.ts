import { eq, and, lte } from "drizzle-orm";
import { db } from "@/db";
import { reminders, events, organizations } from "@/db/schema";
import { sendMessage } from "@/lib/messaging";
import { logger } from "@/lib/logger";

/**
 * Create the default 24h and 2h reminders for an event.
 * Respects the org's reminder settings when orgId is provided.
 */
export async function createDefaultReminders(
  eventId: string,
  startTime: Date,
  orgId?: string,
): Promise<void> {
  let reminders24hEnabled = true;
  let reminders2hEnabled = true;

  if (orgId) {
    const [org] = await db
      .select({
        reminders24hEnabled: organizations.reminders24hEnabled,
        reminders2hEnabled: organizations.reminders2hEnabled,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (org) {
      reminders24hEnabled = org.reminders24hEnabled;
      reminders2hEnabled = org.reminders2hEnabled;
    }
  }

  const twentyFourHoursBefore = new Date(
    startTime.getTime() - 24 * 60 * 60 * 1000,
  );
  const twoHoursBefore = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);

  const now = new Date();
  const values: {
    eventId: string;
    reminderTime: Date;
    reminderType: "24h_before" | "2h_before";
  }[] = [];

  if (reminders24hEnabled && twentyFourHoursBefore > now) {
    values.push({
      eventId,
      reminderTime: twentyFourHoursBefore,
      reminderType: "24h_before",
    });
  }

  if (reminders2hEnabled && twoHoursBefore > now) {
    values.push({
      eventId,
      reminderTime: twoHoursBefore,
      reminderType: "2h_before",
    });
  }

  if (values.length > 0) {
    await db.insert(reminders).values(values);
    logger.info("Created default reminders", {
      eventId,
      orgId,
      count: values.length,
    });
  } else {
    logger.info("No reminders created", {
      eventId,
      orgId,
      reminders24hEnabled,
      reminders2hEnabled,
    });
  }
}

/**
 * Find all unsent reminders where reminderTime <= now.
 */
export async function getUpcomingReminders() {
  const now = new Date();
  return db
    .select({
      reminder: reminders,
      event: events,
    })
    .from(reminders)
    .innerJoin(events, eq(reminders.eventId, events.id))
    .where(
      and(
        eq(reminders.sent, false),
        lte(reminders.reminderTime, now),
        lte(reminders.nextAttemptAt, now),
        eq(events.isCancelled, false),
      ),
    );
}

function formatReminderTime(startTime: Date): string {
  return startTime.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Atomically claim a reminder for processing by leasing nextAttemptAt.
 * Returns true if this call claimed it, false if another run already owns an active lease.
 */
async function claimReminder(reminderId: string): Promise<boolean> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 5 * 60 * 1000);

  const result = await db
    .update(reminders)
    .set({
      nextAttemptAt: leaseUntil,
      lastAttemptAt: now,
    })
    .where(
      and(
        eq(reminders.id, reminderId),
        eq(reminders.sent, false),
        lte(reminders.nextAttemptAt, now),
      ),
    )
    .returning({ id: reminders.id });

  return result.length > 0;
}

async function markReminderSent(reminderId: string): Promise<void> {
  await db
    .update(reminders)
    .set({
      sent: true,
      sentAt: new Date(),
      lastError: null,
    })
    .where(eq(reminders.id, reminderId));
}

function getRetryBackoffMs(attemptCount: number): number {
  const minute = 60 * 1000;
  if (attemptCount <= 1) return 5 * minute;
  if (attemptCount === 2) return 15 * minute;
  if (attemptCount === 3) return 60 * minute;
  return 6 * 60 * minute;
}

async function markReminderFailed(
  reminderId: string,
  errorMessage: string,
): Promise<void> {
  const now = new Date();
  const [row] = await db
    .select({ attemptCount: reminders.attemptCount })
    .from(reminders)
    .where(eq(reminders.id, reminderId));
  const nextAttemptAt = new Date(
    now.getTime() + getRetryBackoffMs((row?.attemptCount ?? 0) + 1),
  );

  await db
    .update(reminders)
    .set({
      sent: false,
      sentAt: null,
      nextAttemptAt,
      lastAttemptAt: now,
      attemptCount: (row?.attemptCount ?? 0) + 1,
      lastError: errorMessage,
    })
    .where(eq(reminders.id, reminderId));
}

/**
 * Send reminder notification with idempotent claim-before-send pattern.
 * Returns true if processed, false if skipped (already claimed by another run).
 */
export async function processReminder(
  reminderId: string,
  event: {
    id: string;
    organizationId: string;
    teamId: string | null;
    title: string;
    eventType: string;
    location: string | null;
    startTime: Date;
    isCancelled: boolean;
  },
): Promise<boolean> {
  // Atomically claim the reminder first — prevents double-send
  const claimed = await claimReminder(reminderId);
  if (!claimed) {
    logger.info("Reminder already claimed by another run", {
      reminderId,
      eventId: event.id,
    });
    return false;
  }

  if (event.isCancelled) {
    await markReminderSent(reminderId);
    logger.info("Skipped reminder for cancelled event", {
      reminderId,
      eventId: event.id,
    });
    return true;
  }

  const timeStr = formatReminderTime(event.startTime);
  const locationStr = event.location ? ` at ${event.location}` : "";
  const body = `Reminder: ${event.title} (${event.eventType}) is on ${timeStr}${locationStr}.`;

  const targetType = event.teamId ? "team" : "organization";
  const targetId = event.teamId;

  try {
    const result = await sendMessage({
      orgId: event.organizationId,
      senderId: "system",
      targetType,
      targetId,
      subject: `Reminder: ${event.title}`,
      body,
      channel: "both",
    });

    logger.info("Reminder notification sent", {
      reminderId,
      eventId: event.id,
      recipientCount: result.recipientCount,
      deliveryCount: result.deliveryCount,
    });
    await markReminderSent(reminderId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await markReminderFailed(reminderId, errorMessage);
    logger.error("Failed to send reminder notification", {
      reminderId,
      eventId: event.id,
      error: errorMessage,
    });
    throw error;
  }

  return true;
}
