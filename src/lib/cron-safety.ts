import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { cronRuns } from "@/db/schema";
import { logger } from "@/lib/logger";

/**
 * Postgres advisory lock key derived from job name.
 * Uses a stable hash so each job gets its own lock namespace.
 */
function jobLockKey(jobName: string): number {
  let hash = 0;
  for (let i = 0; i < jobName.length; i++) {
    hash = (hash * 31 + jobName.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface CronRunResult {
  runId: string;
  itemsFound: number;
  itemsProcessed: number;
  itemsFailed: number;
  durationMs: number;
  status: "completed" | "failed" | "skipped";
}

/**
 * Execute a cron job with advisory-lock concurrency control and run tracking.
 *
 * - Acquires a Postgres advisory lock (non-blocking). If another instance holds
 *   the lock, the run is recorded as "skipped" and the handler is not called.
 * - Tracks every invocation in the cron_runs table for observability.
 * - Catches handler errors so the run record always gets a final status.
 */
export async function withCronSafety(
  jobName: string,
  handler: (runId: string) => Promise<{ found: number; processed: number; failed: number }>,
): Promise<CronRunResult> {
  const lockKey = jobLockKey(jobName);
  const startedAt = new Date();

  // Try to acquire advisory lock (non-blocking, session-level)
  const [lockResult] = await db.execute<{ pg_try_advisory_lock: boolean }>(
    sql`SELECT pg_try_advisory_lock(${lockKey})`,
  );

  if (!lockResult.pg_try_advisory_lock) {
    // Another instance is already running this job
    const [skippedRun] = await db
      .insert(cronRuns)
      .values({
        jobName,
        status: "skipped",
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
      })
      .returning({ id: cronRuns.id });

    logger.warn("Cron job skipped due to concurrent execution", {
      jobName,
      runId: skippedRun.id,
    });

    return {
      runId: skippedRun.id,
      itemsFound: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      durationMs: Date.now() - startedAt.getTime(),
      status: "skipped",
    };
  }

  // Insert run record as "running"
  const [run] = await db
    .insert(cronRuns)
    .values({
      jobName,
      status: "running",
      startedAt,
    })
    .returning({ id: cronRuns.id });

  try {
    const result = await handler(run.id);

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const status = result.failed > 0 && result.processed === 0 ? "failed" : "completed";

    await db
      .update(cronRuns)
      .set({
        status,
        completedAt,
        durationMs,
        itemsFound: result.found,
        itemsProcessed: result.processed,
        itemsFailed: result.failed,
      })
      .where(eq(cronRuns.id, run.id));

    logger.info("Cron job finished", {
      jobName,
      runId: run.id,
      status,
      durationMs,
      ...result,
    });

    return {
      runId: run.id,
      itemsFound: result.found,
      itemsProcessed: result.processed,
      itemsFailed: result.failed,
      durationMs,
      status,
    };
  } catch (error) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(cronRuns)
      .set({
        status: "failed",
        completedAt,
        durationMs,
        error: errorMessage,
      })
      .where(eq(cronRuns.id, run.id));

    logger.error("Cron job failed", {
      jobName,
      runId: run.id,
      durationMs,
      error: errorMessage,
    });

    return {
      runId: run.id,
      itemsFound: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      durationMs,
      status: "failed",
    };
  } finally {
    // Release advisory lock
    await db.execute(sql`SELECT pg_advisory_unlock(${lockKey})`);
  }
}
