-- Exclusive Lucide icon per category row within a tenant.
-- Palette order matches CATEGORY_ICON_IDS in src/lib/category-icon-tokens.ts.
-- Oldest row keeps a duplicated token; nulls and later duplicates receive the next free id.

UPDATE "categories"
SET "icon_token" = NULL
WHERE "icon_token" IS NOT NULL AND btrim("icon_token") = '';

UPDATE "categories" AS c
SET "icon_token" = NULL
FROM (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id, icon_token
      ORDER BY created_at, id
    ) AS rn
  FROM "categories"
  WHERE icon_token IS NOT NULL
) AS dups
WHERE c.id = dups.id
  AND dups.rn > 1;

DO $$
DECLARE
  palette text[] := ARRAY[
    'monitor',
    'laptop',
    'tablet',
    'smartphone',
    'keyboard',
    'mouse',
    'cpu',
    'hard-drive',
    'server',
    'printer',
    'camera',
    'video',
    'speaker',
    'headphones',
    'tv',
    'truck',
    'car',
    'bus',
    'bike',
    'ambulance',
    'armchair',
    'sofa',
    'lamp',
    'building',
    'warehouse',
    'key',
    'shield',
    'package',
    'archive',
    'boxes',
    'clipboard',
    'file-text',
    'book',
    'scissors',
    'wrench',
    'hammer',
    'ruler',
    'stethoscope',
    'syringe',
    'pill',
    'heart-pulse',
    'thermometer',
    'flask-conical',
    'microscope',
    'droplet',
    'utensils',
    'plug',
    'zap',
    'bed',
    'door-open',
    'lock',
    'folder',
    'inbox',
    'tag',
    'layers',
    'pencil',
    'calculator',
    'graduation-cap',
    'briefcase',
    'phone',
    'radio',
    'wifi',
    'battery',
    'fan',
    'lightbulb',
    'cog',
    'recycle',
    'leaf',
    'apple',
    'shirt',
    'glasses',
    'eye',
    'bandage',
    'beaker',
    'shopping-cart',
    'clock',
    'calendar',
    'map-pin',
    'hospital',
    'plane'
  ];
  rec record;
  taken text[];
  pick text;
BEGIN
  FOR rec IN
    SELECT id, tenant_id
    FROM "categories"
    WHERE icon_token IS NULL
    ORDER BY tenant_id, created_at, id
  LOOP
    SELECT COALESCE(array_agg(icon_token), ARRAY[]::text[])
    INTO taken
    FROM "categories"
    WHERE tenant_id = rec.tenant_id
      AND icon_token IS NOT NULL;

    SELECT p
    INTO pick
    FROM unnest(palette) AS p
    WHERE NOT (p = ANY (taken))
    LIMIT 1;

    IF pick IS NULL THEN
      RAISE EXCEPTION
        'Tenant % has more categories than the icon palette (%). Add icons before enforcing uniqueness.',
        rec.tenant_id,
        array_length(palette, 1);
    END IF;

    UPDATE "categories"
    SET icon_token = pick
    WHERE id = rec.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "categories_tenant_icon_token_uidx"
  ON "categories" ("tenant_id", "icon_token")
  WHERE "icon_token" IS NOT NULL;
