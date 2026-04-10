ALTER TABLE "guardians" ADD COLUMN "invite_token" varchar(255);--> statement-breakpoint
ALTER TABLE "guardians" ADD COLUMN "invite_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminders_24h_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminders_2h_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "guardians_invite_token_idx" ON "guardians" USING btree ("invite_token");