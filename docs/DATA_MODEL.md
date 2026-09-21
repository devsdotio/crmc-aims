# Data Model (Draft)

This is a starting schema — refine field names/types once actual asset categories and department lists are finalized. Written at the level of intent; translate directly into drizzle `schema.ts` files per feature.

## `assets` (features/assets/schema.ts)

| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| code | text, unique | value encoded in the asset's QR code |
| name | text | |
| category | text | |
| status | enum | `available`, `borrowed`, `under_repair` |
| condition | text | current condition, updated on each return |
| created_at | timestamp | |

## `consumables` (features/consumables/schema.ts)

| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| name | text | |
| unit | text | e.g. "ream", "box", "piece" |
| quantity_on_hand | integer | |
| low_stock_threshold | integer | triggers alert when quantity drops below this |
| created_at | timestamp | |

## `borrow_requests` (features/borrow-requests/schema.ts)

| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| item_type | enum | `asset` or `consumable` |
| asset_id | uuid, fk → assets, nullable | set when item_type = asset |
| consumable_id | uuid, fk → consumables, nullable | set when item_type = consumable |
| quantity | integer, nullable | only relevant for consumables |
| borrower_name | text | |
| borrower_department | text | |
| borrower_contact | text | |
| requested_at | timestamp | |
| expected_return_at | timestamp, nullable | assets only |
| status | enum | `pending`, `released`, `returned`, `overdue` |
| released_by | uuid, fk → staff/user, nullable | |
| released_at | timestamp, nullable | |
| returned_at | timestamp, nullable | |
| return_condition | text, nullable | logged when an asset is returned |

## Staff Users

Handled via Supabase Auth (its own `auth.users` table) rather than a custom table. If role distinction (custodian vs. assistant staff) is needed beyond "any authenticated user can act," add a lightweight `staff_profiles` table keyed on the Supabase user id with a `role` column.

## Open Questions

- Final asset category list and any category-specific fields
- Final department list for the request form (free text vs. fixed list/dropdown)
- Whether overdue status is computed on read (compare `expected_return_at` to now) or set via a scheduled job — computed-on-read is simpler and recommended to start