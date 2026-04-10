ALTER TABLE "interest_submissions" ADD COLUMN "utm_source" varchar(255);--> statement-breakpoint
ALTER TABLE "interest_submissions" ADD COLUMN "utm_medium" varchar(255);--> statement-breakpoint
ALTER TABLE "interest_submissions" ADD COLUMN "utm_campaign" varchar(255);--> statement-breakpoint
ALTER TABLE "interest_submissions" ADD COLUMN "utm_term" varchar(255);--> statement-breakpoint
ALTER TABLE "interest_submissions" ADD COLUMN "utm_content" varchar(255);--> statement-breakpoint
ALTER TABLE "interest_submissions" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "interest_submissions" ADD COLUMN "landing_page" text;--> statement-breakpoint

CREATE TABLE "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" varchar(100) NOT NULL,
	"organization_id" uuid,
	"organization_slug" varchar(255),
	"location" varchar(120),
	"page_path" text,
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_term" varchar(255),
	"utm_content" varchar(255),
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funnel_events_event_name_idx" ON "funnel_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "funnel_events_org_id_idx" ON "funnel_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "funnel_events_created_at_idx" ON "funnel_events" USING btree ("created_at");
