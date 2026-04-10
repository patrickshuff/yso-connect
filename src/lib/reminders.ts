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
 * Atomically claim a reminder by setting sent=true only if still unsent.
 * Returns true if this call claimed it, false if already sent (another run got it first).
 */
async function claimReminder(reminderId: string): Promise<boolean> {
  const result = await db
    .update(reminders)
    .set({ sent: true, sentAt: new Date() })
    .where(and(eq(reminders.id, reminderId), eq(reminders.sent, false)))
    .returning({ id: reminders.id });

  return result.length > 0;
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
  } catch (error) {
    logger.error("Failed to send reminder notification", {
      reminderId,
      eventId: event.id,
      error: error instanceof Error ? error.message : String(error),
    });
    // Note: reminder stays claimed (sent=true) to prevent retry storms.
    // A separate recovery mechanism should handle failed sends if needed.
    throw error;
  }

  return true;
}
