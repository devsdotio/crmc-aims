CREATE TABLE IF NOT EXISTS "dashboard_metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_key" text NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"snapshot_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_metric_snapshots_key_date_idx" ON "dashboard_metric_snapshots" ("metric_key", "snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboard_metric_snapshots_date_idx" ON "dashboard_metric_snapshots" ("snapshot_date");
