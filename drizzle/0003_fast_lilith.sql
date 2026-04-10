CREATE TABLE "cron_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"items_found" integer,
	"items_processed" integer,
	"items_failed" integer,
	"error" text,
	"duration_ms" integer
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminders_24h_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminders_2h_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "cron_runs_job_name_idx" ON "cron_runs" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "cron_runs_started_at_idx" ON "cron_runs" USING btree ("started_at");--> statement-breakpoint
