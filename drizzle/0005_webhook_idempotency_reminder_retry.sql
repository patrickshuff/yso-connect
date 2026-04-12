CREATE TABLE "stripe_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "last_error" text;
--> statement-breakpoint
CREATE INDEX "reminders_next_attempt_at_idx" ON "reminders" USING btree ("next_attempt_at");
