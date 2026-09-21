-- Dedicated consumable request queue (multi-line) + release cost allocations
CREATE TYPE "public"."consumable_request_status" AS ENUM(
  'pending',
  'approved',
  'rejected',
  'released',
  'cancelled'
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consumable_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_code" text NOT NULL,
  "requester_user_id" uuid,
  "requester_name" text NOT NULL,
  "requester_email" text NOT NULL,
  "requester_phone" text DEFAULT '' NOT NULL,
  "department" text NOT NULL,
  "purpose" text NOT NULL,
  "status" "consumable_request_status" DEFAULT 'pending'::"consumable_request_status" NOT NULL,
  "notes" text,
  "rejection_reason" text,
  "received_by" text,
  "history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "approved_at" timestamp with time zone,
  "approved_by_user_id" uuid,
  "approved_by_name" text,
  "released_at" timestamp with time zone,
  "released_by_user_id" uuid,
  "released_by_name" text,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "consumable_requests_request_code_unique" UNIQUE("request_code")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_requests_status_idx" ON "consumable_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_requests_department_idx" ON "consumable_requests" ("department");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_requests_requested_at_idx" ON "consumable_requests" ("requested_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_requests_requester_user_id_idx" ON "consumable_requests" ("requester_user_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consumable_request_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" uuid NOT NULL,
  "line_no" integer NOT NULL,
  "consumable_id" uuid NOT NULL,
  "item_code" text NOT NULL,
  "item_name" text NOT NULL,
  "category" text NOT NULL,
  "unit" text NOT NULL,
  "quantity_requested" integer NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "consumable_request_lines"
    ADD CONSTRAINT "consumable_request_lines_request_id_consumable_requests_id_fk"
    FOREIGN KEY ("request_id") REFERENCES "public"."consumable_requests"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "consumable_request_lines"
    ADD CONSTRAINT "consumable_request_lines_consumable_id_consumables_id_fk"
    FOREIGN KEY ("consumable_id") REFERENCES "public"."consumables"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_request_lines_request_id_idx" ON "consumable_request_lines" ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_request_lines_consumable_id_idx" ON "consumable_request_lines" ("consumable_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consumable_request_release_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" uuid NOT NULL,
  "request_line_id" uuid NOT NULL,
  "consumable_id" uuid NOT NULL,
  "purchase_lot_id" uuid,
  "lot_code" text,
  "supplier_id" uuid,
  "supplier_name" text,
  "quantity" integer NOT NULL,
  "unit_cost" numeric(14, 2) NOT NULL,
  "line_total" numeric(14, 2) NOT NULL,
  "released_at" timestamp with time zone DEFAULT now() NOT NULL,
  "released_by_user_id" uuid NOT NULL,
  "released_by_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "consumable_request_release_allocations"
    ADD CONSTRAINT "consumable_request_release_allocations_request_id_fk"
    FOREIGN KEY ("request_id") REFERENCES "public"."consumable_requests"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "consumable_request_release_allocations"
    ADD CONSTRAINT "consumable_request_release_allocations_line_id_fk"
    FOREIGN KEY ("request_line_id") REFERENCES "public"."consumable_request_lines"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "consumable_request_release_allocations"
    ADD CONSTRAINT "consumable_request_release_allocations_consumable_id_fk"
    FOREIGN KEY ("consumable_id") REFERENCES "public"."consumables"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "consumable_request_release_allocations"
    ADD CONSTRAINT "consumable_request_release_allocations_lot_id_fk"
    FOREIGN KEY ("purchase_lot_id") REFERENCES "public"."purchase_lots"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_release_alloc_request_id_idx" ON "consumable_request_release_allocations" ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_release_alloc_line_id_idx" ON "consumable_request_release_allocations" ("request_line_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_release_alloc_consumable_id_idx" ON "consumable_request_release_allocations" ("consumable_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_release_alloc_lot_id_idx" ON "consumable_request_release_allocations" ("purchase_lot_id");
