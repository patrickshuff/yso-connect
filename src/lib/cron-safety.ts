/**
 * Cron job execution guard.
 *
 * Prevents overlapping runs of the same cron job by tracking in-flight
 * executions in process memory. In serverless deployments a single invocation
 * per container is expected; the guard protects against warm-instance reuse
 * within the same container lifetime.
 *
 * Note: This in-memory approach is sufficient for cron jobs that have short
 * execution windows (< 60s). For longer jobs consider a distributed lock
 * backed by the database.
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CronWorkResult = { found: number; processed: number; failed: number };

interface CronSkipResult {
  status: "skipped";
}

interface CronRunResult {
  status: "success" | "error";
  runId: string;
  itemsFound: number;
  itemsProcessed: number;
  itemsFailed: number;
  durationMs: number;
}

export type CronSafetyResult = CronSkipResult | CronRunResult;

// ---------------------------------------------------------------------------
// In-flight tracking
// ---------------------------------------------------------------------------

const inFlight = new Set<string>();

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/**
 * Wraps a cron job function with an execution guard that skips concurrent runs.
 *
 * @param name   Unique cron job name (used as the lock key)
 * @param fn     The async work to perform — returns { found, processed, failed }
 */
export async function withCronSafety(
  name: string,
  fn: () => Promise<CronWorkResult>,
): Promise<CronSafetyResult> {
  if (inFlight.has(name)) {
    logger.warn("Cron job already in flight, skipping", { job: name });
    return { status: "skipped" };
  }

  const runId = crypto.randomUUID();
  inFlight.add(name);
  const start = Date.now();

  try {
    logger.info("Cron job started", { job: name, runId });
    const result = await fn();
    const durationMs = Date.now() - start;

    logger.info("Cron job completed", {
      job: name,
      runId,
      durationMs,
      found: result.found,
      processed: result.processed,
      failed: result.failed,
    });

    return {
      status: "success",
      runId,
      itemsFound: result.found,
      itemsProcessed: result.processed,
      itemsFailed: result.failed,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    logger.error("Cron job threw an error", {
      job: name,
      runId,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    });

    return {
      status: "error",
      runId,
      itemsFound: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      durationMs,
    };
  } finally {
    inFlight.delete(name);
  }
}
