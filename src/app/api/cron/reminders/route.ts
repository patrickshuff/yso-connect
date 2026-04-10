import { NextRequest, NextResponse } from "next/server";
import { getUpcomingReminders, processReminder } from "@/lib/reminders";
import { withCronSafety } from "@/lib/cron-safety";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error("CRON_SECRET environment variable is not set");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await withCronSafety("reminders", async () => {
    const dueReminders = await getUpcomingReminders();

    let processed = 0;
    let failed = 0;

    for (const { reminder, event } of dueReminders) {
      try {
        const wasSent = await processReminder(reminder.id, event);
        if (wasSent) processed++;
      } catch (error) {
        failed++;
        logger.error("Failed to process reminder", {
          reminderId: reminder.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { found: dueReminders.length, processed, failed };
  });

  if (result.status === "skipped") {
    return NextResponse.json(
      { status: "skipped", reason: "concurrent execution" },
      { status: 200 },
    );
  }

  return NextResponse.json({
    runId: result.runId,
    status: result.status,
    found: result.itemsFound,
    processed: result.itemsProcessed,
    failed: result.itemsFailed,
    durationMs: result.durationMs,
  });
}
