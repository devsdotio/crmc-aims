-- General consumable classification (Settings → Categories type=consumable_class).
-- Specific consumable categories (type=consumable) may link via parent_id.
-- Denormalized on consumables.category_class (distinct from supply|material classification).

ALTER TABLE "consumables"
  ADD COLUMN IF NOT EXISTS "category_class" text;

UPDATE "consumables"
  SET "category_class" = ''
  WHERE "category_class" IS NULL;

ALTER TABLE "consumables"
  ALTER COLUMN "category_class" SET DEFAULT '';

ALTER TABLE "consumables"
  ALTER COLUMN "category_class" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "consumables_category_class_idx"
  ON "consumables" ("category_class");
