-- Unit of measure on physical assets (editable in Assets registry; defaults to "unit").
ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "unit" text;

UPDATE "assets"
  SET "unit" = 'unit'
  WHERE "unit" IS NULL OR btrim("unit") = '';

ALTER TABLE "assets"
  ALTER COLUMN "unit" SET DEFAULT 'unit';

ALTER TABLE "assets"
  ALTER COLUMN "unit" SET NOT NULL;
