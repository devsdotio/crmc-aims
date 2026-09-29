# Status & enum values (exact from schema / validation)

## Profiles

- `app_role`: `superadmin` | `admin` | `staff` | `borrower`
- `profile_status`: `active` | `deactivated`

## Assets

- `asset_status`: `active` | `needs_repair` | `out_of_service` | `retired` | `missing`
- `asset_assignment_type`: `borrowable` | `assignable`
- `asset_lifecycle_event_type`: `created` | `updated` | `status_changed` | `released` | `returned` | `flagged_maintenance` | `deleted`

## Borrow requests / custody

- `borrow_request_status`: `pending` | `approved` | `rejected` | `released` | `unreleased` | `returned` | `cancelled`
- request type: `borrowable` | `assignable`
- `borrow_transaction_status`: `active` | `returned` | `voided`
- History action union (TS): `submitted`, `approved`, `rejected`, `released`, `unreleased`, `returned`, `cancelled`, `approval_undone`, `edited`

## Consumable requests

- `consumable_request_status`: `pending` | `approved` | `rejected` | `released` | `cancelled`
- source: `portal` | `admin_manual`
- Stock deducted **on release** (schema comment)
- History: `submitted`, `approved`, `rejected`, `released`, `cancelled`, `approval_undone`, `edited`

## Purchase lots

- Schema enum: `purchase_lot_item_type` = `consumable` | `asset`
- **No PO status column/enum** — workflow status lives in `notes` metadata:
  - `pending_approval` | `approved` | `ordered` | `delivered` | `cancelled`
  - Parsed in purchase-lot validation / notes metadata helpers

## Vouchers

- `voucher_status`: `draft` | `pending_approval` | `approved` | `completed` | `cancelled`
- Flow comment: draft → pending_approval → approved → completed (or cancelled)
- Types: `disbursement` | `property_transfer` | `liquidation`

## Petty cash

- `petty_cash_status`: `draft` | `pending_approval` | `approved` | `completed` | `cancelled`
- Flow comment: draft → pending_approval → approved → completed/disbursed (or cancelled)
