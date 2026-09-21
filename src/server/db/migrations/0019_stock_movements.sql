-- Unified consumable stock ledger + destination FKs on consumable requests
DO $$ BEGIN
  CREATE TYPE "stock_movement_direction" AS ENUM ('in', 'out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "stock_movement_reason" AS ENUM ('restock', 'issue', 'adjust');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "consumable_request_source" AS ENUM ('portal', 'admin_manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "movement_code" text NOT NULL,
  "consumable_id" uuid NOT NULL,
  "qty" integer NOT NULL,
  "direction" "stock_movement_direction" NOT NULL,
  "reason" "stock_movement_reason" NOT NULL,
  "department_id" uuid,
  "project_id" uuid,
  "purchase_lot_id" uuid,
  "lot_code" text,
  "unit_cost" numeric(14, 2),
  "line_total" numeric(14, 2),
  "request_id" uuid,
  "notes" text,
  "actor_user_id" uuid NOT NULL,
  "actor_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_consumable_id_consumables_id_fk"
    FOREIGN KEY ("consumable_id") REFERENCES "public"."consumables"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_department_id_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_purchase_lot_id_purchase_lots_id_fk"
    FOREIGN KEY ("purchase_lot_id") REFERENCES "public"."purchase_lots"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_request_id_consumable_requests_id_fk"
    FOREIGN KEY ("request_id") REFERENCES "public"."consumable_requests"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movements_movement_code_idx"
  ON "stock_movements" ("movement_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_consumable_id_idx"
  ON "stock_movements" ("consumable_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx"
  ON "stock_movements" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_request_id_idx"
  ON "stock_movements" ("request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_department_id_idx"
  ON "stock_movements" ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_project_id_idx"
  ON "stock_movements" ("project_id");
--> statement-breakpoint
ALTER TABLE "consumable_requests" ADD COLUMN IF NOT EXISTS "department_id" uuid;
--> statement-breakpoint
ALTER TABLE "consumable_requests" ADD COLUMN IF NOT EXISTS "project_id" uuid;
--> statement-breakpoint
ALTER TABLE "consumable_requests" ADD COLUMN IF NOT EXISTS "source" "consumable_request_source" NOT NULL DEFAULT 'portal';
--> statement-breakpoint
ALTER TABLE "consumable_requests" ADD COLUMN IF NOT EXISTS "requested_by_name" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "consumable_requests"
    ADD CONSTRAINT "consumable_requests_department_id_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "consumable_requests"
    ADD CONSTRAINT "consumable_requests_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_requests_department_id_idx"
  ON "consumable_requests" ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumable_requests_project_id_idx"
  ON "consumable_requests" ("project_id");
