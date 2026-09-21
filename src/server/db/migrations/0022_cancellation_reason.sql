ALTER TABLE "public"."requests" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
--> statement-breakpoint
ALTER TABLE "public"."consumable_requests" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
