CREATE TYPE "public"."project_status" AS ENUM('draft', 'active', 'on_hold', 'completed', 'cancelled');
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"location" text,
	"department" text,
	"start_date" date,
	"end_date" date,
	"budget" numeric(14, 2),
	"notes" text,
	"created_by_user_id" uuid NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_project_code_unique" UNIQUE("project_code")
);
--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "projects_start_date_idx" ON "projects" USING btree ("start_date");
