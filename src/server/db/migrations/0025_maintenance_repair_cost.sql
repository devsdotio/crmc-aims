-- Optional repair cost captured when resolving a maintenance log.
ALTER TABLE "maintenance_logs" ADD COLUMN IF NOT EXISTS "repair_cost" numeric(14, 2);
