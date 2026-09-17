ALTER TABLE "purchase_lots" ADD COLUMN IF NOT EXISTS "project_id" uuid;
--> statement-breakpoint
ALTER TABLE "purchase_lots" ADD COLUMN IF NOT EXISTS "project_name" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_lots" ADD CONSTRAINT "purchase_lots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_lots_project_id_idx" ON "purchase_lots" USING btree ("project_id");
