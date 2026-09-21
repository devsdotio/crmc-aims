-- General classification for inventory consumables (Supplies vs Materials).
-- Existing rows default to 'supply' (Consumable Supplies).
-- Split steps so large tables avoid a single long rewrite under statement_timeout.
ALTER TABLE "consumables"
  ADD COLUMN IF NOT EXISTS "classification" text;
--> statement-breakpoint
UPDATE "consumables"
  SET "classification" = 'supply'
  WHERE "classification" IS NULL;
--> statement-breakpoint
ALTER TABLE "consumables"
  ALTER COLUMN "classification" SET DEFAULT 'supply';
--> statement-breakpoint
ALTER TABLE "consumables"
  ALTER COLUMN "classification" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumables_classification_idx"
  ON "consumables" ("classification");
