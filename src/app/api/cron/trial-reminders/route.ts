import { NextRequest, NextResponse } from "next/server";
import { withCronSafety } from "@/lib/cron-safety";
import { sendAllTrialReminders } from "@/lib/trial-emails";
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

  const result = await withCronSafety("trial-reminders", async () => {
    const { reminder7d, reminder25d } = await sendAllTrialReminders();

    logger.info("Trial reminder cron complete", { reminder7d, reminder25d });

    const found = reminder7d.found + reminder25d.found;
    const processed = reminder7d.sent + reminder25d.sent;
    const failed = reminder7d.failed + reminder25d.failed;

    return { found, processed, failed };
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
