-- 0043_assigned_to_name.sql
-- Person within the department (or project team) who will hold the asset
-- for assignment requests — separate from requested_by_name (filer).

ALTER TABLE "requests"
  ADD COLUMN IF NOT EXISTS "assigned_to_name" text;
