DO $$ BEGIN
  CREATE TYPE "public"."petty_cash_status" AS ENUM('draft', 'pending_approval', 'approved', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "petty_cash_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pcv_number" text NOT NULL,
	"status" "petty_cash_status" DEFAULT 'draft' NOT NULL,
	"voucher_date" date NOT NULL,
	"payee_name" text NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"category" text DEFAULT 'supplies' NOT NULL,
	"particulars" text DEFAULT '' NOT NULL,
	"receipt_number" text,
	"department_id" uuid,
	"department_name" text,
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
	CONSTRAINT "petty_cash_vouchers_pcv_number_unique" UNIQUE("pcv_number")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_pcv_number_idx" ON "petty_cash_vouchers" USING btree ("pcv_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_status_idx" ON "petty_cash_vouchers" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_category_idx" ON "petty_cash_vouchers" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_date_idx" ON "petty_cash_vouchers" USING btree ("voucher_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_department_id_idx" ON "petty_cash_vouchers" USING btree ("department_id");
