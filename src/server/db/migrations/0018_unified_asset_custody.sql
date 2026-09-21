-- Unified coded-asset custody: borrow vs assignment, department XOR project destination
DO $$ BEGIN
  CREATE TYPE "custody_kind" AS ENUM ('borrow', 'assignment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "custody_source" AS ENUM ('portal', 'admin_manual', 'project_legacy');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "asset_request_type" AS ENUM ('borrowable', 'assignable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "borrow_transactions" ADD COLUMN IF NOT EXISTS "custody_kind" "custody_kind" NOT NULL DEFAULT 'borrow';
--> statement-breakpoint
ALTER TABLE "borrow_transactions" ADD COLUMN IF NOT EXISTS "department_id" uuid;
--> statement-breakpoint
ALTER TABLE "borrow_transactions" ADD COLUMN IF NOT EXISTS "project_id" uuid;
--> statement-breakpoint
ALTER TABLE "borrow_transactions" ADD COLUMN IF NOT EXISTS "source" "custody_source" NOT NULL DEFAULT 'portal';
--> statement-breakpoint
ALTER TABLE "borrow_transactions" ADD COLUMN IF NOT EXISTS "requested_by_name" text;
--> statement-breakpoint
ALTER TABLE "borrow_transactions" ALTER COLUMN "due_date" DROP NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "borrow_transactions"
    ADD CONSTRAINT "borrow_transactions_department_id_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "borrow_transactions"
    ADD CONSTRAINT "borrow_transactions_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "borrow_transactions_department_id_idx"
  ON "borrow_transactions" ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "borrow_transactions_project_id_idx"
  ON "borrow_transactions" ("project_id");
--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "request_type" "asset_request_type";
--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "department_id" uuid;
--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "requested_by_name" text;
--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "expected_return_date" DROP NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "requests"
    ADD CONSTRAINT "requests_department_id_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "requests_department_id_idx"
  ON "requests" ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "requests_request_type_idx"
  ON "requests" ("request_type");
