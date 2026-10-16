-- Allow fractional warehouse quantities (materials & supplies).
-- integer → numeric(12, 2) is lossless for existing whole-number rows.

ALTER TABLE "consumables"
  ALTER COLUMN "current_qty" TYPE numeric(12, 2) USING "current_qty"::numeric(12, 2),
  ALTER COLUMN "reserved_qty" TYPE numeric(12, 2) USING "reserved_qty"::numeric(12, 2),
  ALTER COLUMN "min_threshold" TYPE numeric(12, 2) USING "min_threshold"::numeric(12, 2);

ALTER TABLE "purchase_lots"
  ALTER COLUMN "quantity" TYPE numeric(12, 2) USING "quantity"::numeric(12, 2),
  ALTER COLUMN "quantity_remaining" TYPE numeric(12, 2) USING "quantity_remaining"::numeric(12, 2);

ALTER TABLE "stock_movements"
  ALTER COLUMN "qty" TYPE numeric(12, 2) USING "qty"::numeric(12, 2);

ALTER TABLE "consumable_request_lines"
  ALTER COLUMN "quantity_requested" TYPE numeric(12, 2) USING "quantity_requested"::numeric(12, 2);

ALTER TABLE "consumable_request_release_allocations"
  ALTER COLUMN "quantity" TYPE numeric(12, 2) USING "quantity"::numeric(12, 2);
