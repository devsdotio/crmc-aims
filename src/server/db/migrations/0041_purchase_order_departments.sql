CREATE TABLE IF NOT EXISTS "purchase_order_departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
  "po_reference" text NOT NULL,
  "department_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_order_departments"
    ADD CONSTRAINT "purchase_order_departments_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_order_departments"
    ADD CONSTRAINT "purchase_order_departments_department_id_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_order_departments"
    ADD CONSTRAINT "purchase_order_departments_tenant_po_dept_uidx"
    UNIQUE ("tenant_id", "po_reference", "department_id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_departments_tenant_po_idx"
  ON "purchase_order_departments" USING btree ("tenant_id", "po_reference");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_departments_department_id_idx"
  ON "purchase_order_departments" USING btree ("department_id");
--> statement-breakpoint
-- Backfill: one join row per distinct project PO + department
INSERT INTO "purchase_order_departments" ("tenant_id", "po_reference", "department_id")
SELECT DISTINCT
  pl."tenant_id",
  pl."reference",
  pl."department_id"
FROM "purchase_lots" pl
WHERE pl."project_id" IS NOT NULL
  AND pl."department_id" IS NOT NULL
  AND pl."reference" IS NOT NULL
  AND trim(pl."reference") <> ''
ON CONFLICT ON CONSTRAINT "purchase_order_departments_tenant_po_dept_uidx" DO NOTHING;
