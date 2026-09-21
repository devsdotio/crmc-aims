ALTER TABLE "purchase_lots" ADD COLUMN IF NOT EXISTS "department_id" uuid;
--> statement-breakpoint
ALTER TABLE "purchase_lots" ADD COLUMN IF NOT EXISTS "department_name" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_lots" ADD CONSTRAINT "purchase_lots_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_lots_department_id_idx" ON "purchase_lots" USING btree ("department_id");
