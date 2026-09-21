CREATE TYPE "public"."asset_lifecycle_event_type" AS ENUM('created', 'updated', 'status_changed', 'released', 'returned', 'flagged_maintenance', 'deleted');--> statement-breakpoint
CREATE TABLE "asset_lifecycle_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid,
	"asset_code" text NOT NULL,
	"event_type" "asset_lifecycle_event_type" NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_email" text,
	"actor_display_name" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"from_holder" text,
	"to_holder" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_lifecycle_events" ADD CONSTRAINT "asset_lifecycle_events_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_lifecycle_events_asset_id_created_at_idx" ON "asset_lifecycle_events" USING btree ("asset_id","created_at");--> statement-breakpoint
CREATE INDEX "asset_lifecycle_events_asset_code_created_at_idx" ON "asset_lifecycle_events" USING btree ("asset_code","created_at");--> statement-breakpoint
CREATE INDEX "asset_lifecycle_events_actor_user_id_idx" ON "asset_lifecycle_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "asset_lifecycle_events_event_type_idx" ON "asset_lifecycle_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "asset_lifecycle_events_created_at_idx" ON "asset_lifecycle_events" USING btree ("created_at");