-- Missing / lost / stolen accountability path for coded assets.
ALTER TYPE "public"."asset_status" ADD VALUE IF NOT EXISTS 'missing';
--> statement-breakpoint
ALTER TYPE "public"."return_condition" ADD VALUE IF NOT EXISTS 'lost';
--> statement-breakpoint
ALTER TYPE "public"."return_condition" ADD VALUE IF NOT EXISTS 'stolen';
