CREATE TYPE "public"."project_asset_assignment_status" AS ENUM('assigned', 'returned', 'written_off');
--> statement-breakpoint
CREATE TABLE "project_asset_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"asset_code" text NOT NULL,
	"asset_name" text NOT NULL,
	"status" "project_asset_assignment_status" DEFAULT 'assigned' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"returned_at" timestamp with time zone,
	"assigned_by_user_id" uuid NOT NULL,
	"assigned_by_name" text NOT NULL,
	"returned_by_user_id" uuid,
	"returned_by_name" text,
	"notes" text,
	"return_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_asset_assignments" ADD CONSTRAINT "project_asset_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_asset_assignments" ADD CONSTRAINT "project_asset_assignments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "project_asset_assignments_project_id_idx" ON "project_asset_assignments" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "project_asset_assignments_asset_id_idx" ON "project_asset_assignments" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX "project_asset_assignments_status_idx" ON "project_asset_assignments" USING btree ("status");
