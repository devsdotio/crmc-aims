-- 0034_project_progress_indicators.sql
-- Project progress indicators and milestone checklist tracking

CREATE TABLE IF NOT EXISTS "project_progress_indicators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL REFERENCES "tenants"("id"),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "target_date" date,
  "completed_date" date,
  "is_completed" boolean DEFAULT false NOT NULL,
  "order_index" integer DEFAULT 0 NOT NULL,
  "completed_by_user_id" uuid,
  "completed_by_name" text,
  "created_by_user_id" uuid NOT NULL,
  "created_by_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_progress_indicators_tenant_idx" ON "project_progress_indicators" ("tenant_id");
CREATE INDEX IF NOT EXISTS "project_progress_indicators_project_idx" ON "project_progress_indicators" ("project_id");
CREATE INDEX IF NOT EXISTS "project_progress_indicators_is_completed_idx" ON "project_progress_indicators" ("is_completed");
CREATE INDEX IF NOT EXISTS "project_progress_indicators_order_idx" ON "project_progress_indicators" ("order_index");

-- Enable RLS and create isolation policy
ALTER TABLE "project_progress_indicators" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "project_progress_indicators";
CREATE POLICY tenant_isolation_policy ON "project_progress_indicators"
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
