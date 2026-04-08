import { NextResponse } from "next/server";
import { getUpcomingReminders, processReminder } from "@/lib/reminders";
import { logger } from "@/lib/logger";

export async function GET() {
  const dueReminders = await getUpcomingReminders();

  let processed = 0;
  for (const { reminder } of dueReminders) {
    try {
      await processReminder(reminder.id);
      processed++;
    } catch (error) {
      logger.error("Failed to process reminder", {
        reminderId: reminder.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Reminder cron completed", {
    due: dueReminders.length,
    processed,
  });

  return NextResponse.json({
    due: dueReminders.length,
    processed,
  });
}
