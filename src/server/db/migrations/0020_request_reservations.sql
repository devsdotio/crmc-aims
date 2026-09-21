-- Reserve assets and consumable qty when a request is approved (before issue).
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "reserved_for_request_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "assets"
    ADD CONSTRAINT "assets_reserved_for_request_id_requests_id_fk"
    FOREIGN KEY ("reserved_for_request_id") REFERENCES "requests"("id")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_reserved_for_request_id_idx"
  ON "assets" ("reserved_for_request_id");
--> statement-breakpoint
ALTER TABLE "consumables" ADD COLUMN IF NOT EXISTS "reserved_qty" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Backfill asset holds from currently approved (not yet released) requests.
UPDATE "assets" AS a
SET "reserved_for_request_id" = sub.request_id
FROM (
  SELECT DISTINCT ON (item->>'assetId')
    (item->>'assetId')::uuid AS asset_id,
    r.id AS request_id
  FROM "requests" r,
    jsonb_array_elements(r.items) AS item
  WHERE r.status = 'approved'
    AND COALESCE(item->>'assetId', '') <> ''
  ORDER BY item->>'assetId', r.requested_at DESC
) AS sub
WHERE a.id = sub.asset_id
  AND a.current_holder IS NULL
  AND a.reserved_for_request_id IS NULL;
--> statement-breakpoint

-- Backfill reserved supply qty from approved (not yet issued) request lines.
UPDATE "consumables" AS c
SET "reserved_qty" = sub.qty
FROM (
  SELECT
    l.consumable_id,
    SUM(l.quantity_requested)::integer AS qty
  FROM "consumable_request_lines" l
  JOIN "consumable_requests" r ON r.id = l.request_id
  WHERE r.status = 'approved'
  GROUP BY l.consumable_id
) AS sub
WHERE c.id = sub.consumable_id;
