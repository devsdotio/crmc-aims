-- Progressive work-performed notes while a maintenance flag is still open.
ALTER TABLE "maintenance_logs"
  ADD COLUMN IF NOT EXISTS "work_notes" text;
