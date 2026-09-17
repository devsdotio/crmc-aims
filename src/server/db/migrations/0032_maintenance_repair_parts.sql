-- Optional itemized parts/materials recorded when resolving a maintenance flag.
ALTER TABLE "maintenance_logs"
  ADD COLUMN IF NOT EXISTS "repair_parts" jsonb DEFAULT '[]'::jsonb NOT NULL;
