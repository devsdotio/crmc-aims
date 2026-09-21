-- Manual sandbox/testing flag on catalog roots. Default false; no name-based seeding.
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "is_sandbox" boolean DEFAULT false NOT NULL;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "is_sandbox" boolean DEFAULT false NOT NULL;
ALTER TABLE "consumables" ADD COLUMN IF NOT EXISTS "is_sandbox" boolean DEFAULT false NOT NULL;
ALTER TABLE "asset_models" ADD COLUMN IF NOT EXISTS "is_sandbox" boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS "departments_is_sandbox_idx" ON "departments" ("is_sandbox");
CREATE INDEX IF NOT EXISTS "assets_is_sandbox_idx" ON "assets" ("is_sandbox");
CREATE INDEX IF NOT EXISTS "consumables_is_sandbox_idx" ON "consumables" ("is_sandbox");
CREATE INDEX IF NOT EXISTS "asset_models_is_sandbox_idx" ON "asset_models" ("is_sandbox");
