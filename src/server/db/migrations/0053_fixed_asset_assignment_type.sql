-- Facilities (buildings, gym, warehouse) are registered assets that are not issued.
ALTER TYPE "asset_assignment_type" ADD VALUE IF NOT EXISTS 'fixed';
