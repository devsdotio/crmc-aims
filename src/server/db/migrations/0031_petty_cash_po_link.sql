ALTER TABLE "petty_cash_vouchers" ADD COLUMN IF NOT EXISTS "supplier_id" uuid;
--> statement-breakpoint
ALTER TABLE "petty_cash_vouchers" ADD COLUMN IF NOT EXISTS "supplier_name" text;
--> statement-breakpoint
ALTER TABLE "petty_cash_vouchers" ADD COLUMN IF NOT EXISTS "purchase_order_number" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_po_number_idx" ON "petty_cash_vouchers" USING btree ("purchase_order_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_supplier_id_idx" ON "petty_cash_vouchers" USING btree ("supplier_id");
