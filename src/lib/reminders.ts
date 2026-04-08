import { eq, and, lte } from "drizzle-orm";
import { db } from "@/db";
import { reminders, events } from "@/db/schema";
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
    .where(and(eq(reminders.sent, false), lte(reminders.reminderTime, now)));
}

/**
 * Mark a reminder as sent. In the future, this will trigger a notification
 * via the messaging system.
 */
export async function processReminder(reminderId: string): Promise<void> {
  const now = new Date();

  const [updated] = await db
    .update(reminders)
    .set({
      sent: true,
      sentAt: now,
    })
    .where(eq(reminders.id, reminderId))
    .returning();

  if (updated) {
    logger.info("Processed reminder", {
      reminderId,
      eventId: updated.eventId,
    });
  }
}
