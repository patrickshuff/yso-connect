import {
  integer,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const cronRuns = pgTable(
  "cron_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobName: text("job_name").notNull(),
    status: text("status", { enum: ["running", "completed", "failed", "skipped"] }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    itemsFound: integer("items_found"),
    itemsProcessed: integer("items_processed"),
    itemsFailed: integer("items_failed"),
    error: text("error"),
    durationMs: integer("duration_ms"),
  },
  (table) => [
    index("cron_runs_job_name_idx").on(table.jobName),
    index("cron_runs_started_at_idx").on(table.startedAt),
  ],
);
