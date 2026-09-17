-- 0039_request_submission_group.sql
-- Links split multi-type wizard submissions (borrow / assign / supplies)
-- without mixing incompatible workflows on a single request row.

ALTER TABLE "requests"
  ADD COLUMN IF NOT EXISTS "submission_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "consumable_requests"
  ADD COLUMN IF NOT EXISTS "submission_group_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "requests_submission_group_id_idx"
  ON "requests" ("submission_group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_requests_submission_group_id_idx"
  ON "consumable_requests" ("submission_group_id");
