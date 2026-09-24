CREATE TABLE IF NOT EXISTS "voucher_departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
  "voucher_id" uuid NOT NULL,
  "department_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "petty_cash_departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
  "petty_cash_id" uuid NOT NULL,
  "department_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "voucher_departments"
    ADD CONSTRAINT "voucher_departments_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "voucher_departments"
    ADD CONSTRAINT "voucher_departments_voucher_id_vouchers_id_fk"
    FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "voucher_departments"
    ADD CONSTRAINT "voucher_departments_department_id_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "voucher_departments"
    ADD CONSTRAINT "voucher_departments_tenant_voucher_dept_uidx"
    UNIQUE ("tenant_id", "voucher_id", "department_id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voucher_departments_tenant_voucher_idx"
  ON "voucher_departments" USING btree ("tenant_id", "voucher_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voucher_departments_department_id_idx"
  ON "voucher_departments" USING btree ("department_id");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "petty_cash_departments"
    ADD CONSTRAINT "petty_cash_departments_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "petty_cash_departments"
    ADD CONSTRAINT "petty_cash_departments_petty_cash_id_petty_cash_vouchers_id_fk"
    FOREIGN KEY ("petty_cash_id") REFERENCES "public"."petty_cash_vouchers"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "petty_cash_departments"
    ADD CONSTRAINT "petty_cash_departments_department_id_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "petty_cash_departments"
    ADD CONSTRAINT "petty_cash_departments_tenant_pc_dept_uidx"
    UNIQUE ("tenant_id", "petty_cash_id", "department_id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_departments_tenant_pc_idx"
  ON "petty_cash_departments" USING btree ("tenant_id", "petty_cash_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_departments_department_id_idx"
  ON "petty_cash_departments" USING btree ("department_id");
--> statement-breakpoint
INSERT INTO "voucher_departments" ("tenant_id", "voucher_id", "department_id")
SELECT DISTINCT v."tenant_id", v."id", v."department_id"
FROM "vouchers" v
WHERE v."department_id" IS NOT NULL
ON CONFLICT ON CONSTRAINT "voucher_departments_tenant_voucher_dept_uidx" DO NOTHING;
--> statement-breakpoint
INSERT INTO "petty_cash_departments" ("tenant_id", "petty_cash_id", "department_id")
SELECT DISTINCT p."tenant_id", p."id", p."department_id"
FROM "petty_cash_vouchers" p
WHERE p."department_id" IS NOT NULL
ON CONFLICT ON CONSTRAINT "petty_cash_departments_tenant_pc_dept_uidx" DO NOTHING;
--> statement-breakpoint
-- Backfill warehouse / asset / supply / material POs into the same join table
INSERT INTO "purchase_order_departments" ("tenant_id", "po_reference", "department_id")
SELECT DISTINCT
  pl."tenant_id",
  pl."reference",
  pl."department_id"
FROM "purchase_lots" pl
WHERE pl."department_id" IS NOT NULL
  AND pl."reference" IS NOT NULL
  AND trim(pl."reference") <> ''
ON CONFLICT ON CONSTRAINT "purchase_order_departments_tenant_po_dept_uidx" DO NOTHING;
