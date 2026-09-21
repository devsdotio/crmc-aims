ALTER TABLE "profiles" ADD COLUMN "last_active_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "profiles_last_active_at_idx" ON "profiles" USING btree ("last_active_at");
