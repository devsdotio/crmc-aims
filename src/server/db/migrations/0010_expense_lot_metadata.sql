-- Phase 3: snapshot FIFO lot draws on expense lines for reverse restock
ALTER TABLE "project_expense_lines"
  ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_expense_lines_consumable_id_idx"
  ON "project_expense_lines" USING btree ("consumable_id");
