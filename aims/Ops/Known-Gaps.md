# Known gaps (observed in working code)

These are mismatches between wired code paths — not roadmap wishes from docs.

## Unimplemented / unused

| Item | Evidence |
|------|----------|
| Server action stubs | `src/features/{consumables,borrow-requests,dashboard}/actions.ts` throw `"Not implemented"`; **zero imports** |
| `locations` table | Schema exported; **never queried** outside its own file |
| Default Create-Next-App SVGs | `public/next.svg`, `vercel.svg`, etc. unused by app code |

## Broken / missing UI targets

| Item | Evidence |
|------|----------|
| Dashboard quick actions | Link to `/assets/new` and `/consumables/restock` — **no matching `page.tsx`** |
| Report nav | Omits `/reports/requests` and `/reports/purchase-orders` though pages + APIs exist |

## Thin / alias routes (wired but redirect-only)

- `/audit-trails` → audit-logs page
- `/purchase-orders/assets` → asset scope page
- `/vouchers`, `/petty-cash`, `/settings`, `/consumable-requests`, `/disbursements`, `/borrow-requests`, `/borrower-db`, `/borrower-db/assets`

## Present but not in primary nav

- `/purchase-orders/consumables` — page exists; sidebar uses supplies/materials instead
- `/borrower-db/requisition` — page exists; not listed in borrower sidebar sections from scan

## Testing

No Jest/Vitest/Playwright product test suite. Only manual/ops scripts under `scripts/`.

## Staff vs admin product split

`ASSET_OPERATOR_ROLES` = superadmin + admin only — staff is browse-oriented in this phase (`roles.ts` comments + gates).
