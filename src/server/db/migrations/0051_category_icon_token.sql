-- Optional Lucide icon id for settings-driven categories.
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "icon_token" text;
