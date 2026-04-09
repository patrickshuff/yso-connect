import { eq, and, lte } from "drizzle-orm";
import { db } from "@/db";
import { reminders, events } from "@/db/schema";
import { sendMessage } from "@/lib/messaging";
import { logger } from "@/lib/logger";

/**
 * Create the default 24h and 2h reminders for an event.
 */
export async function createDefaultReminders(
  eventId: string,
  startTime: Date,
): Promise<void> {
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

  if (twentyFourHoursBefore > now) {
    values.push({
      eventId,
      reminderTime: twentyFourHoursBefore,
      reminderType: "24h_before",
    });
  }

  if (twoHoursBefore > now) {
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
      count: values.length,
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
 * Send reminder notification and mark as sent.
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
): Promise<void> {
  if (event.isCancelled) {
    await db
      .update(reminders)
      .set({ sent: true, sentAt: new Date() })
      .where(eq(reminders.id, reminderId));
    logger.info("Skipped reminder for cancelled event", {
      reminderId,
      eventId: event.id,
    });
    return;
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
  }

  await db
    .update(reminders)
    .set({ sent: true, sentAt: new Date() })
    .where(eq(reminders.id, reminderId));
}
