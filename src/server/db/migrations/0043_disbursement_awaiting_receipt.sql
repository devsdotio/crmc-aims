ALTER TYPE "public"."voucher_status" ADD VALUE IF NOT EXISTS 'disbursed' BEFORE 'completed';
--> statement-breakpoint
ALTER TYPE "public"."petty_cash_status" ADD VALUE IF NOT EXISTS 'disbursed' BEFORE 'completed';
