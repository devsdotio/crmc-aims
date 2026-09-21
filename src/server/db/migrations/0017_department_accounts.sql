-- Departments as first-class master data + one department login (borrower) per department
CREATE UNIQUE INDEX IF NOT EXISTS "departments_name_lower_idx"
  ON "departments" (lower("name"));
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "department_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "profiles"
    ADD CONSTRAINT "profiles_department_id_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_department_id_idx"
  ON "profiles" ("department_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_one_borrower_per_department_idx"
  ON "profiles" ("department_id")
  WHERE "role" = 'borrower' AND "department_id" IS NOT NULL;
