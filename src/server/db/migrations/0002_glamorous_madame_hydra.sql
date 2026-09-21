CREATE TYPE "public"."app_role" AS ENUM('superadmin', 'admin', 'staff', 'borrower');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('active', 'deactivated');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "app_role" DEFAULT 'staff' NOT NULL,
	"status" "profile_status" DEFAULT 'active' NOT NULL,
	"department" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "profiles_status_idx" ON "profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");