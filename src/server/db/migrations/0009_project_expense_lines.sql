-- Phase 2: misc / unexpected project expense ledger
CREATE TYPE "public"."project_expense_line_type" AS ENUM('miscellaneous', 'adjustment', 'consumable', 'material', 'asset_writeoff');
--> statement-breakpoint
CREATE TYPE "public"."project_expense_category" AS ENUM('travel', 'snacks', 'labor', 'broken_asset', 'fees', 'adjustment', 'miscellaneous');
--> statement-breakpoint
CREATE TABLE "project_expense_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"line_type" "project_expense_line_type" DEFAULT 'miscellaneous' NOT NULL,
	"category" "project_expense_category" DEFAULT 'miscellaneous' NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"quantity" numeric(12, 2),
	"unit_cost" numeric(14, 2),
	"consumable_id" uuid,
	"asset_id" uuid,
	"incurred_on" date NOT NULL,
	"notes" text,
	"recorded_by_user_id" uuid NOT NULL,
	"recorded_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_expense_lines" ADD CONSTRAINT "project_expense_lines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "project_expense_lines_project_id_idx" ON "project_expense_lines" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "project_expense_lines_incurred_on_idx" ON "project_expense_lines" USING btree ("incurred_on");
--> statement-breakpoint
CREATE INDEX "project_expense_lines_category_idx" ON "project_expense_lines" USING btree ("category");
