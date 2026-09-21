-- Schema drift fix: code expects audit history on custody ledger rows.
-- Column is in 0004 CREATE TABLE, but some DBs were applied without it.
ALTER TABLE "borrow_transactions"
  ADD COLUMN IF NOT EXISTS "history" jsonb DEFAULT '[]'::jsonb NOT NULL;
