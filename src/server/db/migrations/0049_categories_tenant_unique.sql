-- Category names must be unique per tenant + type (not globally across tenants).
-- The old (type, lower(name)) index blocked creating the same label in another tenant
-- and surfaced as a misleading "database connectivity" error in the UI.

DROP INDEX IF EXISTS "categories_type_name_lower_uidx";

CREATE UNIQUE INDEX IF NOT EXISTS "categories_tenant_type_name_lower_uidx"
  ON "categories" ("tenant_id", "type", lower("name"));
