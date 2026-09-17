-- 0033_tenant_rls_policies.sql
-- Defense-in-depth PostgreSQL Row Level Security (RLS) for multi-tenancy

DO $$
DECLARE
  tbl text;
  domain_tables text[] := ARRAY[
    'asset_lifecycle_events',
    'asset_models',
    'assets',
    'audit_logs',
    'requests',
    'borrow_transactions',
    'categories',
    'consumable_requests',
    'consumables',
    'dashboard_metric_snapshots',
    'departments',
    'locations',
    'maintenance_logs',
    'petty_cash_vouchers',
    'project_asset_assignments',
    'project_expense_lines',
    'projects',
    'purchase_lots',
    'stock_movements',
    'suppliers',
    'vouchers'
  ];
BEGIN
  FOREACH tbl IN ARRAY domain_tables LOOP
    -- Enable RLS on the domain table
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Drop policy if previously created
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);

    -- Create tenant isolation policy
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I
       AS PERMISSIVE
       FOR ALL
       USING (
         tenant_id = nullif(current_setting(''app.current_tenant_id'', true), '''')::uuid
         OR (current_setting(''app.is_superadmin'', true) = ''true'')
         OR (nullif(current_setting(''request.jwt.claim.role'', true), '''') = ''service_role'')
       )
       WITH CHECK (
         tenant_id = nullif(current_setting(''app.current_tenant_id'', true), '''')::uuid
         OR (current_setting(''app.is_superadmin'', true) = ''true'')
         OR (nullif(current_setting(''request.jwt.claim.role'', true), '''') = ''service_role'')
       );',
      tbl
    );
  END LOOP;
END $$;
