ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'past_due';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'canceled';
