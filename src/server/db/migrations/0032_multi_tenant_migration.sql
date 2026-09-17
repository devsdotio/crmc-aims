-- 0032_multi_tenant_migration.sql

BEGIN;

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"branding" jsonb,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);

-- 2. Seed primary default tenant (CRMC)
INSERT INTO "tenants" ("id", "slug", "name", "branding", "settings")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'crmc',
  'CRMC',
  '{}'::jsonb,
  '{}'::jsonb
) ON CONFLICT DO NOTHING;

-- 3. Add tenant_id to all domain tables (with default to backfill)
ALTER TABLE "asset_lifecycle_events" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "asset_models" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "assets" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "requests" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "borrow_transactions" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "categories" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "consumable_requests" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "consumables" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "dashboard_metric_snapshots" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "departments" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "locations" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "maintenance_logs" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "petty_cash_vouchers" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "project_asset_assignments" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "project_expense_lines" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "projects" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "purchase_lots" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "stock_movements" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "suppliers" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");
ALTER TABLE "vouchers" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id");

-- Add tenant_id to profiles (nullable for superadmins)
ALTER TABLE "profiles" ADD COLUMN "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES "tenants"("id");
-- Nullify for superadmin
UPDATE "profiles" SET "tenant_id" = NULL WHERE "role" = 'superadmin';

-- 4. Refactor single-column unique constraints into composite (tenant_id, code)

-- Assets
ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_asset_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "assets_tenant_code_idx" ON "assets" ("tenant_id", "asset_code");

-- Consumables
ALTER TABLE "consumables" DROP CONSTRAINT IF EXISTS "consumables_item_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "consumables_tenant_item_code_idx" ON "consumables" ("tenant_id", "item_code");

-- Vouchers
ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "vouchers_voucher_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "vouchers_tenant_voucher_code_idx" ON "vouchers" ("tenant_id", "voucher_code");

-- Petty Cash
ALTER TABLE "petty_cash_vouchers" DROP CONSTRAINT IF EXISTS "petty_cash_vouchers_pcv_number_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "petty_cash_vouchers_tenant_pcv_number_idx" ON "petty_cash_vouchers" ("tenant_id", "pcv_number");

-- Projects
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_project_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "projects_tenant_project_code_idx" ON "projects" ("tenant_id", "project_code");

-- Departments
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "departments_tenant_code_idx" ON "departments" ("tenant_id", "code");

-- 5. Profiles - borrower constraint
DROP INDEX IF EXISTS "profiles_one_borrower_per_department_idx";
CREATE UNIQUE INDEX "profiles_one_borrower_per_department_idx" ON "profiles" ("tenant_id", "department_id") WHERE "role" = 'borrower' AND "department_id" IS NOT NULL;

COMMIT;
