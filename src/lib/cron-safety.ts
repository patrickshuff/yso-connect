import { logger } from "@/lib/logger";

interface CronResult<T> {
  runId: string;
  status: "completed" | "skipped";
  itemsFound: number;
  itemsProcessed: number;
  itemsFailed: number;
  durationMs: number;
  data?: T;
}

interface CronPayload {
  found: number;
  processed: number;
  failed: number;
}

const activeRuns = new Set<string>();

export async function withCronSafety(
  jobName: string,
  fn: () => Promise<CronPayload>,
): Promise<CronResult<CronPayload>> {
  if (activeRuns.has(jobName)) {
    logger.info("Cron job skipped — already running", { job: jobName });
    return {
      runId: "",
      status: "skipped",
      itemsFound: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      durationMs: 0,
    };
  }

  const runId = crypto.randomUUID();
  activeRuns.add(jobName);
  const start = Date.now();

  try {
    const payload = await fn();
    const durationMs = Date.now() - start;
    logger.info("Cron job completed", { job: jobName, runId, durationMs, ...payload });
    return {
      runId,
      status: "completed",
      itemsFound: payload.found,
      itemsProcessed: payload.processed,
      itemsFailed: payload.failed,
      durationMs,
      data: payload,
    };
  } finally {
    activeRuns.delete(jobName);
  }
}
