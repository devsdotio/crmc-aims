-- Phase 1.5: suppliers registry + purchase cost lots; asset supplier link
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive');
--> statement-breakpoint
CREATE TYPE "public"."purchase_lot_item_type" AS ENUM('consumable', 'asset');
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_code" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"notes" text,
	"status" "supplier_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_supplier_code_unique" UNIQUE("supplier_code")
);
--> statement-breakpoint
CREATE TABLE "purchase_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_code" text NOT NULL,
	"item_type" "purchase_lot_item_type" NOT NULL,
	"consumable_id" uuid,
	"asset_id" uuid,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"supplier_id" uuid,
	"supplier_name" text,
	"quantity" integer NOT NULL,
	"quantity_remaining" integer NOT NULL,
	"unit_cost" numeric(14, 2) NOT NULL,
	"total_cost" numeric(14, 2) NOT NULL,
	"purchased_on" date NOT NULL,
	"reference" text,
	"notes" text,
	"recorded_by_user_id" uuid NOT NULL,
	"recorded_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_lots_lot_code_unique" UNIQUE("lot_code")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "supplier_id" uuid;
--> statement-breakpoint
ALTER TABLE "purchase_lots" ADD CONSTRAINT "purchase_lots_consumable_id_consumables_id_fk" FOREIGN KEY ("consumable_id") REFERENCES "public"."consumables"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_lots" ADD CONSTRAINT "purchase_lots_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_lots" ADD CONSTRAINT "purchase_lots_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "suppliers_status_idx" ON "suppliers" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "suppliers_name_idx" ON "suppliers" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "purchase_lots_item_type_idx" ON "purchase_lots" USING btree ("item_type");
--> statement-breakpoint
CREATE INDEX "purchase_lots_consumable_id_idx" ON "purchase_lots" USING btree ("consumable_id");
--> statement-breakpoint
CREATE INDEX "purchase_lots_asset_id_idx" ON "purchase_lots" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX "purchase_lots_supplier_id_idx" ON "purchase_lots" USING btree ("supplier_id");
--> statement-breakpoint
CREATE INDEX "purchase_lots_purchased_on_idx" ON "purchase_lots" USING btree ("purchased_on");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_supplier_id_idx" ON "assets" USING btree ("supplier_id");
