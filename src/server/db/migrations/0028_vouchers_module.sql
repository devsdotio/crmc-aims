DO $$ BEGIN
  CREATE TYPE "public"."voucher_type" AS ENUM('disbursement', 'property_transfer', 'liquidation');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."voucher_status" AS ENUM('draft', 'pending_approval', 'approved', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_code" text NOT NULL,
	"type" "voucher_type" DEFAULT 'disbursement' NOT NULL,
	"status" "voucher_status" DEFAULT 'draft' NOT NULL,
	"voucher_date" date NOT NULL,
	"payee_name" text NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"supplier_id" uuid,
	"supplier_name" text,
	"purchase_order_number" text,
	"asset_id" uuid,
	"asset_code" text,
	"asset_name" text,
	"particulars" text DEFAULT '' NOT NULL,
	"check_number" text,
	"payment_method" text,
	"is_legacy" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_by_name" text NOT NULL,
	"approved_by_user_id" uuid,
	"approved_by_name" text,
	"approved_at" timestamp with time zone,
	"completed_by_user_id" uuid,
	"completed_by_name" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_voucher_code_unique" UNIQUE("voucher_code")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_code_idx" ON "vouchers" USING btree ("voucher_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_type_idx" ON "vouchers" USING btree ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_status_idx" ON "vouchers" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_supplier_id_idx" ON "vouchers" USING btree ("supplier_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_asset_id_idx" ON "vouchers" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_po_number_idx" ON "vouchers" USING btree ("purchase_order_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_date_idx" ON "vouchers" USING btree ("voucher_date");
