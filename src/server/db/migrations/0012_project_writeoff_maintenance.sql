-- Phase 5: project damage/write-off can open a maintenance log
ALTER TYPE "public"."maintenance_source" ADD VALUE IF NOT EXISTS 'project_assignment';
