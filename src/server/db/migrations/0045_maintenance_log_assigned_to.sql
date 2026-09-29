-- Snapshot of who held the asset when it was flagged for maintenance
-- (person and/or department/project custody label). Persists after return.
ALTER TABLE "maintenance_logs"
  ADD COLUMN IF NOT EXISTS "assigned_to_name" text;
