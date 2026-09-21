-- Asset models (product catalog) + per-unit model link for multi-copy equipment
CREATE TABLE IF NOT EXISTS "asset_models" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "model_code" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "manufacturer" text,
  "default_assignment_type" "asset_assignment_type" DEFAULT 'borrowable'::"asset_assignment_type" NOT NULL,
  "default_location" text,
  "default_unit_value" numeric(14, 2),
  "image_url" text,
  "notes" text,
  "created_by_user_id" uuid NOT NULL,
  "created_by_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "asset_models_model_code_unique" UNIQUE("model_code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_models_category_idx" ON "asset_models" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_models_name_idx" ON "asset_models" ("name");
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "model_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "assets"
    ADD CONSTRAINT "assets_model_id_asset_models_id_fk"
    FOREIGN KEY ("model_id") REFERENCES "public"."asset_models"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_model_id_idx" ON "assets" ("model_id");
