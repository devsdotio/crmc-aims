-- Settings-driven categories: asset/consumable category is free text (matches categories.name)
ALTER TABLE "assets" ALTER COLUMN "category" TYPE text USING "category"::text;
--> statement-breakpoint
ALTER TABLE "borrow_requests" ALTER COLUMN "category" TYPE text USING "category"::text;
--> statement-breakpoint
ALTER TABLE "borrow_transactions" ALTER COLUMN "category" TYPE text USING "category"::text;
--> statement-breakpoint
ALTER TABLE "maintenance_logs" ALTER COLUMN "category" TYPE text USING "category"::text;
--> statement-breakpoint
ALTER TABLE "consumables" ALTER COLUMN "category" TYPE text USING "category"::text;
--> statement-breakpoint
-- Fresh installs (0000) never had these columns; prod may already have them.
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'asset' NOT NULL;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "color_token" text;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid;
--> statement-breakpoint
-- Stable institutional taxonomy (name unique per type, case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS "categories_type_name_lower_uidx"
  ON "categories" (type, lower(name));
