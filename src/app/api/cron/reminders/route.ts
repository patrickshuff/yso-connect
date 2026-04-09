import { NextRequest, NextResponse } from "next/server";
import { getUpcomingReminders, processReminder } from "@/lib/reminders";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueReminders = await getUpcomingReminders();

  let processed = 0;
  for (const { reminder, event } of dueReminders) {
    try {
      await processReminder(reminder.id, event);
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
