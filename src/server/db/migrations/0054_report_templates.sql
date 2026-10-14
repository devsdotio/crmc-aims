-- Tenant-owned custom report templates (separate from Beta /reports)

CREATE TABLE IF NOT EXISTS "report_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "description" text,
  "dataset" text NOT NULL,
  "columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "default_filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "layout" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_by_user_id" uuid,
  "created_by_name" text,
  "updated_by_user_id" uuid,
  "updated_by_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "report_templates_tenant_id_idx" ON "report_templates" ("tenant_id");
CREATE INDEX IF NOT EXISTS "report_templates_dataset_idx" ON "report_templates" ("dataset");

ALTER TABLE "report_templates" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "report_templates";

CREATE POLICY tenant_isolation_policy ON "report_templates"
  AS PERMISSIVE
  FOR ALL
  USING (
    tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
    OR (current_setting('app.is_superadmin', true) = 'true')
    OR (nullif(current_setting('request.jwt.claim.role', true), '') = 'service_role')
  )
  WITH CHECK (
    tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
    OR (current_setting('app.is_superadmin', true) = 'true')
    OR (nullif(current_setting('request.jwt.claim.role', true), '') = 'service_role')
  );
