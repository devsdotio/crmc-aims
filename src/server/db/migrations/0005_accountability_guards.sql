-- One active custodial checkout per asset (prevents double-release races).
CREATE UNIQUE INDEX IF NOT EXISTS "borrow_transactions_one_active_per_asset"
  ON "borrow_transactions" ("asset_id")
  WHERE "status" = 'active' AND "asset_id" IS NOT NULL;
