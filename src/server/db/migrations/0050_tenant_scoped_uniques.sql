-- Fix remaining global unique indexes that break multi-tenant creates
-- (same label/code in another tenant → 23505, previously masked as "DB down").

-- Departments: name was globally unique; code already tenant-scoped.
DROP INDEX IF EXISTS "departments_name_lower_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "departments_tenant_name_lower_uidx"
  ON "departments" ("tenant_id", lower("name"));

-- Suppliers
DROP INDEX IF EXISTS "suppliers_supplier_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_tenant_supplier_code_uidx"
  ON "suppliers" ("tenant_id", "supplier_code");

-- Locations
DROP INDEX IF EXISTS "locations_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "locations_tenant_code_uidx"
  ON "locations" ("tenant_id", "code");

-- Dashboard snapshots (per-tenant daily metrics)
DROP INDEX IF EXISTS "dashboard_metric_snapshots_key_date_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_metric_snapshots_tenant_key_date_uidx"
  ON "dashboard_metric_snapshots" ("tenant_id", "metric_key", "snapshot_date");

-- Operational codes (generated with random tokens, but must not collide across tenants)
DROP INDEX IF EXISTS "stock_movements_movement_code_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movements_tenant_movement_code_uidx"
  ON "stock_movements" ("tenant_id", "movement_code");

DROP INDEX IF EXISTS "purchase_lots_lot_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_lots_tenant_lot_code_uidx"
  ON "purchase_lots" ("tenant_id", "lot_code");

DROP INDEX IF EXISTS "asset_models_model_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "asset_models_tenant_model_code_uidx"
  ON "asset_models" ("tenant_id", "model_code");

DROP INDEX IF EXISTS "borrow_transactions_log_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "borrow_transactions_tenant_log_code_uidx"
  ON "borrow_transactions" ("tenant_id", "log_code");

DROP INDEX IF EXISTS "consumable_requests_request_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "consumable_requests_tenant_request_code_uidx"
  ON "consumable_requests" ("tenant_id", "request_code");

DROP INDEX IF EXISTS "borrow_requests_request_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "borrow_requests_tenant_request_code_uidx"
  ON "requests" ("tenant_id", "request_code");

DROP INDEX IF EXISTS "maintenance_logs_log_code_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "maintenance_logs_tenant_log_code_uidx"
  ON "maintenance_logs" ("tenant_id", "log_code");
