-- Allow category icons to be reused across rows in a tenant.
-- Icons are visual labels only; uniqueness blocked creating new categories
-- once the palette was exhausted.

DROP INDEX IF EXISTS "categories_tenant_icon_token_uidx";
