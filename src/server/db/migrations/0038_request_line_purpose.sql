-- 0038_request_line_purpose.sql
-- Per-line purpose for multi-purpose consumable requests

ALTER TABLE "consumable_request_lines"
  ADD COLUMN IF NOT EXISTS "purpose" text;

-- Backfill from parent request header purpose
UPDATE "consumable_request_lines" AS lines
SET "purpose" = COALESCE(NULLIF(trim(req."purpose"), ''), 'General')
FROM "consumable_requests" AS req
WHERE lines."request_id" = req."id"
  AND (lines."purpose" IS NULL OR trim(lines."purpose") = '');

ALTER TABLE "consumable_request_lines"
  ALTER COLUMN "purpose" SET DEFAULT 'General';

ALTER TABLE "consumable_request_lines"
  ALTER COLUMN "purpose" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "consumable_request_lines_purpose_idx"
  ON "consumable_request_lines" ("purpose");
