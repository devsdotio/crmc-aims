# Disbursements (vouchers & petty cash)

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/disbursements` → `/disbursements/vouchers`; `/disbursements/petty-cash` |
| Aliases | `/vouchers`, `/petty-cash` redirect into disbursements |
| Components | `src/components/vouchers/*`, `petty-cash/*` |
| Client | `src/features/vouchers/*`, `petty-cash/*` |
| Server | `vouchers/`, `petty-cash/`, `disbursements/disbursement-departments.ts` |
| Schema | `vouchers`, `voucherDepartments`, `pettyCashVouchers`, `pettyCashDepartments` |

## Voucher types

`disbursement` | `property_transfer` | `liquidation`

## Shared status flow

`draft` → `pending_approval` → `approved` → `completed` (or `cancelled`)

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/vouchers`, `/api/petty-cash` |
| GET, PATCH, DELETE | `/api/vouchers/:id`, `/api/petty-cash/:id` |
| PATCH | `/api/vouchers/:id/status`, `/api/petty-cash/:id/status` |
| GET | `/api/vouchers/next-code`, `/api/petty-cash/next-code` |

Department links managed via disbursements helper module.
