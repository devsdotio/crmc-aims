CREATE TYPE "public"."borrow_request_status" AS ENUM('pending', 'approved', 'rejected', 'returned');--> statement-breakpoint
CREATE TYPE "public"."borrow_transaction_status" AS ENUM('active', 'returned');--> statement-breakpoint
CREATE TYPE "public"."return_condition" AS ENUM('good', 'damaged', 'needs_repair');--> statement-breakpoint
CREATE TYPE "public"."consumable_category" AS ENUM('paper', 'ink_toner', 'cleaning', 'office_supplies', 'medical');--> statement-breakpoint
CREATE TYPE "public"."stock_action_type" AS ENUM('restock', 'adjustment', 'checkout');--> statement-breakpoint
CREATE TYPE "public"."maintenance_condition" AS ENUM('good', 'needs_maintenance', 'damaged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."maintenance_source" AS ENUM('return_checkout', 'manual_flag');--> statement-breakpoint
CREATE TABLE "borrow_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_code" text NOT NULL,
	"requester_user_id" uuid,
	"requester_name" text NOT NULL,
	"requester_email" text NOT NULL,
	"requester_phone" text DEFAULT '' NOT NULL,
	"department" text NOT NULL,
	"item_description" text NOT NULL,
	"asset_id" uuid,
	"asset_code" text,
	"category" "asset_category" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"purpose" text NOT NULL,
	"expected_return_date" date NOT NULL,
	"status" "borrow_request_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"rejection_reason" text,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "borrow_requests_request_code_unique" UNIQUE("request_code")
);--> statement-breakpoint
CREATE TABLE "borrow_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_code" text NOT NULL,
	"request_id" uuid,
	"request_code" text,
	"asset_id" uuid,
	"asset_code" text NOT NULL,
	"asset_name" text NOT NULL,
	"category" "asset_category" NOT NULL,
	"borrower_user_id" uuid,
	"borrower_name" text NOT NULL,
	"borrower_email" text DEFAULT '' NOT NULL,
	"borrower_phone" text DEFAULT '' NOT NULL,
	"department" text NOT NULL,
	"released_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" date NOT NULL,
	"returned_at" timestamp with time zone,
	"status" "borrow_transaction_status" DEFAULT 'active' NOT NULL,
	"condition_on_return" "return_condition",
	"condition_notes" text,
	"released_by_user_id" uuid NOT NULL,
	"released_by_name" text NOT NULL,
	"received_by_user_id" uuid,
	"received_by_name" text,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "borrow_transactions_log_code_unique" UNIQUE("log_code")
);--> statement-breakpoint
CREATE TABLE "consumables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_code" text NOT NULL,
	"name" text NOT NULL,
	"category" "consumable_category" NOT NULL,
	"unit" text NOT NULL,
	"current_qty" integer DEFAULT 0 NOT NULL,
	"min_threshold" integer DEFAULT 0 NOT NULL,
	"location" text NOT NULL,
	"supplier" text,
	"last_restocked" timestamp with time zone,
	"notes" text,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consumables_item_code_unique" UNIQUE("item_code")
);--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_code" text NOT NULL,
	"asset_id" uuid,
	"asset_code" text NOT NULL,
	"asset_name" text NOT NULL,
	"category" "asset_category" NOT NULL,
	"condition" "maintenance_condition" NOT NULL,
	"source" "maintenance_source" DEFAULT 'manual_flag' NOT NULL,
	"date_logged" date NOT NULL,
	"logged_by_user_id" uuid NOT NULL,
	"logged_by_name" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolution_date" date,
	"resolution_notes" text,
	"resolved_by_user_id" uuid,
	"resolved_by_name" text,
	"related_borrow_log_code" text,
	"scheduled_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_logs_log_code_unique" UNIQUE("log_code")
);--> statement-breakpoint
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_request_id_borrow_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."borrow_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_transactions" ADD CONSTRAINT "borrow_transactions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "borrow_requests_status_idx" ON "borrow_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "borrow_requests_department_idx" ON "borrow_requests" USING btree ("department");--> statement-breakpoint
CREATE INDEX "borrow_requests_requested_at_idx" ON "borrow_requests" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "borrow_requests_asset_id_idx" ON "borrow_requests" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "borrow_transactions_status_idx" ON "borrow_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "borrow_transactions_due_date_idx" ON "borrow_transactions" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "borrow_transactions_asset_id_idx" ON "borrow_transactions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "borrow_transactions_released_at_idx" ON "borrow_transactions" USING btree ("released_at");--> statement-breakpoint
CREATE INDEX "borrow_transactions_department_idx" ON "borrow_transactions" USING btree ("department");--> statement-breakpoint
CREATE INDEX "consumables_category_idx" ON "consumables" USING btree ("category");--> statement-breakpoint
CREATE INDEX "consumables_location_idx" ON "consumables" USING btree ("location");--> statement-breakpoint
CREATE INDEX "consumables_current_qty_idx" ON "consumables" USING btree ("current_qty");--> statement-breakpoint
CREATE INDEX "maintenance_logs_asset_id_idx" ON "maintenance_logs" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "maintenance_logs_is_resolved_idx" ON "maintenance_logs" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "maintenance_logs_date_logged_idx" ON "maintenance_logs" USING btree ("date_logged");--> statement-breakpoint
CREATE INDEX "maintenance_logs_condition_idx" ON "maintenance_logs" USING btree ("condition");
