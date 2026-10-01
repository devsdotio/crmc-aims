-- General asset classifications (managed in Categories as type=asset_class).
-- Specific asset categories (type=asset) may link via parent_id.
-- Assets/models store the class name denormalized for list/PO filters.
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "parent_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parent_id_fk'
  ) THEN
    ALTER TABLE "categories"
      ADD CONSTRAINT "categories_parent_id_fk"
      FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
      ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_id_idx"
  ON "categories" ("parent_id");
--> statement-breakpoint
ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "classification" text;
--> statement-breakpoint
UPDATE "assets"
  SET "classification" = ''
  WHERE "classification" IS NULL;
--> statement-breakpoint
ALTER TABLE "assets"
  ALTER COLUMN "classification" SET DEFAULT '';
--> statement-breakpoint
ALTER TABLE "assets"
  ALTER COLUMN "classification" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_classification_idx"
  ON "assets" ("classification");
--> statement-breakpoint
ALTER TABLE "asset_models"
  ADD COLUMN IF NOT EXISTS "classification" text;
--> statement-breakpoint
UPDATE "asset_models"
  SET "classification" = ''
  WHERE "classification" IS NULL;
--> statement-breakpoint
ALTER TABLE "asset_models"
  ALTER COLUMN "classification" SET DEFAULT '';
--> statement-breakpoint
ALTER TABLE "asset_models"
  ALTER COLUMN "classification" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_models_classification_idx"
  ON "asset_models" ("classification");
