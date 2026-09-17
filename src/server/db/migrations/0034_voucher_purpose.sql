-- Separate narrative purpose from itemized particulars on vouchers / petty cash.
ALTER TABLE "vouchers"
  ADD COLUMN IF NOT EXISTS "purpose" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "petty_cash_vouchers"
  ADD COLUMN IF NOT EXISTS "purpose" text NOT NULL DEFAULT '';
