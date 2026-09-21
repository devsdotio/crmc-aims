# Admin Asset & Inventory Flow — Agreed Plan

> **Status:** Agreed. Do not implement until this document is accepted as the working spec.  
> **Date:** 2026-08-17  
> **Scope of this pass:** Finish the asset & inventory module **end-to-end** for an **admin-operated** workflow, while keeping the department requester portal.  
> **Out of this pass:** Paper approval e-sign, purchase-order screens, maintenance polish, reporting/expense rollups, projects-module redesign.

This document is the source of truth for the next implementation phase. Existing docs (`ASSET_CLASSIFICATION_AND_REQUEST_FLOWS.md`, `DATA_MODEL.md`, `SYSTEM_FEATURES_AND_FLOWS.md`) describe the *previous* borrower-account model and should be treated as historical until they are updated after this work lands.

---

## 1. Product shift (why we are changing this)

CRMC-AIMS is the Property Custodian system for Cebu Roosevelt Memorial Colleges.

**Before:** Individual borrowers had accounts. They requested items in-app. Admin/staff approved and released. Assignable assets were effectively project-only. Departments/locations existed as tables but were mostly free-text.

**Now (agreed):**

1. Paper **Requisition Slip** approvals still happen **offline** (Recommending / Budget Officer / President). The admin only issues/releases after that paper is already approved — **or** after a department portal request is approved in-app.
2. Requesters are **department accounts**, not people. Creating a “borrower” user means creating a **department login** (department email + password). People in that department share that login and request from there.
3. Admin can still **issue/release manually** without a portal request (walk-up / paper slip).
4. Destinations are **exactly one of:** a **department** or a **project**. No person master data. No project logins.
5. For this phase, **only `admin`** (and `superadmin` by privilege) operates these flows. `staff` does not.

Purchase Orders exist in real life when stock is not on hand. **This phase does not build PO screens.** If stock is zero, issue is **blocked**. PO is noted as a later module.

---

## 2. Locked decisions

| # | Topic | Decision |
|---|--------|----------|
| 1 | Paper approvals | Offline. Digital issue happens only after the slip is already approved, or via in-app department request. |
| 2 | Purchase orders | **Design note only.** No PO UI/API this phase. Missing stock → block issue; restock later. |
| 3 | Department portal | **Keep.** Department accounts request; admin sees, approves, releases. |
| 4 | Admin manual issue | **Keep.** Admin picks items → destination → release. Do **not** digitize the full slip as a form. Optional notes / “requested by” name is enough. |
| 5 | Issue UX | **Separate per type:** borrowable, assignable, consumable. Shared destination picker. Do not mix types in one transaction. |
| 6 | Due dates | Required for **borrowable** issues. |
| 7 | Assignable custody | **Not project-only.** Department **or** project. Projects remain a first-class holder + expense bucket. |
| 8 | Consumable return | **No.** Consumables are issued and consumed. No return-to-stock in this phase. |
| 9 | Assignees | Department **or** project only. No people CRUD. Optional free-text name on the request/issue for the person who signed the paper. |
| 10 | Department membership | One department per account. A department account is tied to exactly one department. |
| 11 | Cost center code | Optional / nullable. Not a separate entity this phase. |
| 12 | Suggested dealer | Link to existing `suppliers` where relevant (acquisition / restock / PO-later). Not required on every issue line. |
| 13 | Slip identity | No slip photo/number required. Date + department/project + purpose + optional requester name is enough. |
| 14 | Transaction codes | Every issue/release gets a visible code (e.g. `ISS-2026-0001` or keep/extend existing `REQ-` / `LOG-` codes — see §6). Show on the frontend. |
| 15 | Data model strategy | **Unify, do not fork.** Portal request and admin manual issue must end in the **same** custody / stock-movement path. Adapt existing tables; do not invent a parallel “issues” stack. |
| 16 | Destination rule | **Exactly one of** department **or** project on every issue. Never both. Never neither. |
| 17 | Asset history | Per-asset lifecycle timeline (borrowed by Registrar → returned → assigned to Project X → …). |
| 18 | Consumable history | Stock in/out ledger (restock +100, issued 12 to Registrar, adjust, etc.) with actor, destination, lots, qty, cost snapshot. |
| 19 | Operator roles | **Admin only** for approve / reject / release / manual issue / return (coded assets). Superadmin inherits. Staff is out of these actions this phase. |
| 20 | Status model | Portal: `pending → approved \| rejected → released → returned \| closed`. Manual issue: skip pending/approved; create already **released**. Optional `draft` is **not** required in v1. |
| 21 | Missing stock | **Block** the issue/release. Admin restocks first (later: create a PO). No backorder / reservation this phase. |
| 22 | Projects as requesters | **No login.** Projects are assignment/expense targets only. |
| 23 | Portal request payload | Items, purpose, expected return (borrowable), optional notes, optional “requested by” person name (free text). Destination is always the logged-in department. |
| 24 | Out of scope | E-sign chain, PO module, maintenance polish, full reports/expense rollups, projects redesign beyond using project as a holder. |

---

## 3. Actors and accounts

```
superadmin  → platform / can do admin work
admin       → Property Custodian operator (the only operator this phase)
staff       → exists in schema; NOT used for issue/release this phase
borrower    → department login only (not a named person)
```

### Department accounts

- Admin creates a user with role `borrower`.
- That user **is** a department account: email + password + **required `department_id`**.
- One department ↔ one login (do not allow two borrower accounts on the same department in v1).
- UI copy should read as **Department account**, not “borrower person.”
- Optional free-text “requested by” on a request is the person who filled the paper slip. It is **not** an account.

### Admin

- Uses the staff shell.
- Sees portal requests, approves/rejects, releases.
- Can skip the portal and **manually issue** from on-hand stock.
- Records restocks (purchase lots).

### Project

- CRUD as today (admin).
- Can **hold** borrowable/assignable assets and receive consumable issues.
- Cannot log in. Cannot file portal requests.
- Expense tracking per project remains a reason this entity exists; we do not rebuild the expenses module this pass.

---

## 4. Classifications (unchanged meanings, updated destinations)

| Type | What it is | On issue | Returned? | Destination |
|------|------------|----------|-----------|-------------|
| **Borrowable** | Coded unit (`asset_code` / QR) | Custody transfer + **due date** | **Yes** | Department **xor** project |
| **Assignable** | Same coded unit, long-term hold | Custody transfer, **no due date** | **Yes** when unassigned / returned to custodian | Department **xor** project |
| **Consumable** | Qty + unit + lots | Deduct stock from lots | **No** | Department **xor** project |

Availability for coded assets: `status = active` **and** not currently held.

Consumable availability: `current_qty` (and lot remainders) must cover the release qty. If not, **block**.

---

## 5. Target workflows

Two **entry** paths, one **fulfillment** path.

```
                    ┌─────────────────────────────┐
                    │ Department portal request    │
                    │ pending → approved|rejected  │
                    └──────────────┬──────────────┘
                                   │ approve
                                   ▼
┌──────────────────┐    ┌─────────────────────────┐    ┌────────────────────┐
│ Admin manual     │───►│ RELEASE / ISSUE         │───►│ Custody or stock   │
│ issue (paper)    │    │ (same engine per type)  │    │ movement + codes   │
└──────────────────┘    └─────────────────────────┘    └────────────────────┘
```

### 5.1 Portal (department account)

1. Department user logs in.
2. Chooses **one type** of request (borrowable / assignable / consumable) — do not mix types on one request.
3. Selects items (coded assets available, or consumable product + qty).
4. Enters purpose, optional notes, optional requested-by name.
5. Borrowable: expected return date required.
6. Submits → `pending`.
7. Admin sees the queue, approves or rejects (rejection reason required).
8. On approve, admin **releases** from on-hand stock:
   - Coded asset: must still be available; else block.
   - Consumable: admin picks lot(s) or FIFO; qty must be on hand; else block.
9. Status → `released`. Transaction code visible.
10. Borrowable/assignable: later **return to custodian** closes custody. Consumable: request is done at release (`closed` / equivalent).

Portal destination is **always the requesting department**. A department cannot request “for a project” in v1. Admin can still manually issue to a project.

### 5.2 Admin manual issue (paper slip)

1. Admin opens Issue for **one type**.
2. Picks destination: **department or project** (required, exactly one).
3. Picks item(s) currently on hand.
4. Enters purpose, optional requested-by name, notes.
5. Borrowable: due date required.
6. Confirm → system creates the release **immediately** (no pending/approve).
7. Same custody / stock effects as a portal release.
8. If any selected item/qty is not on hand → **block the whole issue** (or block that line — prefer **block the submit** with a clear message). No partial silent skip.

Do **not** clone the paper table (cost center, dealer, estimated cost) as required issue fields. Those belong to purchasing/PO later. Optional cost center on the header is fine if cheap.

### 5.3 Returns (coded assets only)

- Borrowable: return by due date; overdue is derived (`due_date < today` and still out).
- Assignable: return / unassign when the department or project no longer holds it.
- On return: clear holder, write lifecycle event, close the custody row.
- Condition on return / maintenance flag: **keep existing behavior** if already there; do not expand maintenance this pass.

### 5.4 Consumable stock in

- Admin restock → new `purchase_lots` row, `current_qty` up, **stock movement** `in` / `restock`.
- Adjust (correction) stays admin-only, requires a reason, writes a movement.
- Checkout/issue is only through the unified release engine (portal or manual), not a disconnected “checkout” that bypasses destination tracking. Existing ad-hoc checkout should be folded into manual issue or removed from operator UI this pass.

---

## 6. Data model (adapt, don’t fork)

Principle: **one release engine per type**, two ways to start it (portal request vs admin-created released record).

### 6.1 Master data to actually use

| Entity | Action |
|--------|--------|
| `departments` | First-class. CRUD for admin. Required on department accounts. Used as issue destination. |
| `projects` | Keep. Destination + holder. No auth user. |
| `profiles` | `borrower` rows **must** have `department_id` (FK). Stop treating `department` text as source of truth for new work. |
| `locations` | Not required for destination this pass. Asset/consumable storage location can stay as today. |
| `suppliers` + `purchase_lots` | Keep. Restock and consumable release allocations. |
| People table | **Do not add.** |

### 6.2 Requests (portal)

Keep a request header. Prefer **one request module per type** (or one table with a `request_type` discriminator) — but **do not** mix asset + consumable lines on one request.

Minimum header fields:

- `request_code` (visible)
- `type`: `borrowable` \| `assignable` \| `consumable`
- `source`: `portal` \| `admin_manual` (manual may skip this table entirely and only write the release — see below)
- `department_id` (portal: always the account’s department)
- `purpose`, optional `notes`, optional `requested_by_name`
- `expected_return_date` (borrowable only; nullable otherwise)
- `status`
- `requester_user_id` (the department account, portal only)

**Admin manual issue:** do **not** force a fake `pending` request. Write the custody/stock rows directly with `source = admin_manual` and a visible issue/log code. If we need a header for listing “all issues,” a thin `issues`/`releases` header **shared by both paths** is acceptable — as long as it is not a second fulfillment engine.

Recommendation for implementation (to decide at coding start, not a new product question):

- **Preferred:** one `releases` (or reuse/rename request+transaction listing) header that both portal fulfillment and manual issue attach to, so the admin “Issue history” screen is one list.
- **Acceptable:** portal stays on `requests` / `consumable_requests`; manual issue writes only `borrow_transactions` / assignment / stock movements, and the UI unions them. Slightly messier lists.

Do **not** keep two consumable pipelines (`/api/requests` mixed lines vs `/api/consumable-requests`). This pass **collapses to one consumable request+release path**.

### 6.3 Coded-asset custody (borrowable + assignable)

Today: `borrow_transactions` (short-term) vs `project_asset_assignments` (project only).

**Target:** one custody idea with a type:

- `custody_kind`: `borrow` (due date) \| `assignment` (open-ended)
- `asset_id`
- `department_id` **xor** `project_id`
- `due_date` required iff borrow
- `released_at`, `returned_at`, status, released-by admin, optional requested-by name
- `source` + optional `request_id`
- visible `log_code` / issue code

Implementation options (pick at coding time):

1. **Generalize** `borrow_transactions` (or rename to `asset_custody`) to allow assignable + department/project destinations, and stop using `project_asset_assignments` for new work (migrate or dual-write briefly).
2. **Widen** `project_asset_assignments` into `asset_assignments` with nullable `project_id` and `department_id`, and keep `borrow_transactions` only for due-dated borrows.

**Prefer option 1** if the borrow ledger already has return/overdue/history; add `custody_kind` + destination FKs. Either way: **one asset cannot be out in two open custody rows.**

Also keep/write `assets.current_holder` (or replace with a derived holder from the open custody row — derived is better long-term; denormalized holder is fine if updated in the same transaction).

### 6.4 Asset lifecycle timeline

Keep `asset_lifecycle_events` as the **readable history** for a single coded asset:

- released/borrowed → `{department|project}`
- returned to custodian
- assigned → `{department|project}`
- unassigned
- maintenance / retired (existing events; don’t expand)

Every release/return must insert a lifecycle row. The custody table is operational (what is out now); lifecycle is the story.

### 6.5 Consumable stock movements

`consumables.history` jsonb is not enough as the source of truth.

Add a real **`stock_movements`** (name flexible) table:

- `movement_code` (visible)
- `consumable_id`, qty, direction `in` \| `out`
- `reason`: `restock` \| `issue` \| `adjust` (no `return` this phase)
- `department_id` xor `project_id` (required for `issue`; null for restock/adjust unless we want optional)
- `purchase_lot_id` (and unit cost snapshot) — one movement per lot allocation is OK
- actor admin, timestamp, notes, optional `request_id`

Release of qty 12 from two lots = two movement lines (or one movement + allocation children). **Keep `consumable_request_release_allocations`** if we still have request lines; movements should still be written so restock and issue show in one ledger.

Rules:

- Request/approve does **not** change qty.
- Release deducts lot remainder + `current_qty` and writes movements.
- Restock increases both and writes `in`.
- No consumable return.

### 6.6 Fields we will not require this phase

- Cost center (optional text/FK later)
- Suggested dealer on the issue line
- Estimated cost on the slip
- Slip number / photo
- Person entity
- PO header/lines

---

## 7. Authorization this phase

| Action | Allowed |
|--------|---------|
| CRUD departments, department accounts | admin, superadmin |
| Portal: create/cancel own request | borrower (own department only) |
| Approve / reject / release / manual issue / restock / adjust / asset return | **admin, superadmin only** |
| Staff | No asset/inventory mutations this phase (can leave role in DB; tighten `ASSET_OPERATOR_ROLES`) |

Actor identity still comes from session, never from the client body.

---

## 8. Frontend implications (for later implementation, not this brainstorm)

Admin:

- Department CRUD + “Department accounts” (current Users flow, relabeled / constrained).
- Request queues split by type (or filters).
- **Issue** screens split by type, with destination = department **or** project.
- Asset detail: lifecycle timeline.
- Consumable detail: stock movement ledger (in/out).
- Transaction codes visible on lists and detail.

Department portal:

- Request wizards stay, but destination is implicit (their department).
- No project picker.
- No mixed-type cart.

Staff role: hide or disable operator actions if a staff user still exists.

Borrower-as-person UX (individual name as the account) goes away.

---

## 9. Explicit non-goals (this pass)

- Digitizing Requisition Slip / Purchase Order forms and signature workflow.
- Building a Purchase Order module (create PO, receive, then auto-issue).
- Consumable returns / unused-qty restock from departments.
- Issuing mixed types in one batch.
- Person master data / assigning to a named employee as the holder.
- Project logins or portal requests “on behalf of a project.”
- Destination = both department and project at once.
- Backorders when qty is zero.
- Making `staff` an operator.
- Broad reports, department expense dashboards, maintenance overhaul.

When stock is missing, the **future** path is: create PO → receive into lots → then issue. Document that in UI copy if we block (“Not on hand. Restock first. Purchase orders will be added later.”).

---

## 10. Suggested implementation slices (do not do in one go)

Work in this order so each slice is shippable:

1. **Departments as real master data** + department accounts (`profiles.department_id`, one login per department, admin CRUD). Relabel borrower portal as department portal.
2. **Tighten authz** to admin/superadmin for operator mutations.
3. **Unify coded-asset custody** (department xor project; borrow vs assign; lifecycle events; returns). Wire portal borrowable + assignable + admin manual issue.
4. **Unify consumable issue** (one request path, lot allocations, **stock_movements**, no return, block if insufficient qty). Wire portal + admin manual issue. Fold ad-hoc checkout into this.
5. **Admin Issue history / codes** visible in UI; asset timeline + consumable ledger screens.
6. **Cleanup:** remove mixed-type requests, dead `staff` operator access, stop using free-text department as source of truth on new writes.

Slice 1 is the foundation. Do not start slice 3 until department accounts are real.

---

## 11. Current codebase mapping (so we don’t get lost)

| Today | This plan |
|-------|-----------|
| `borrower` = person account | `borrower` = department account |
| `departments` table unused; free-text `department` | `departments` is required FK |
| Assignable ≈ `project_asset_assignments` only | Assignable → department **or** project |
| Portal + `/api/requests` can mix asset/consumable | One type per request |
| UI consumables still on `/api/requests`; dedicated `consumable-requests` exists | **One** consumable path |
| Ad-hoc `/checkout` and scan-lot release | Same engine as issue, with destination |
| `ASSET_OPERATOR_ROLES` includes `staff` | Remove `staff` for this phase |
| `expected_return_date` ignored at release (`+7 days`) | Use the request/manual due date |
| Consumable history jsonb | Add `stock_movements` (or equivalent) |
| No person table | Still no person table |

---

## 12. Acceptance criteria (this module pass)

- Admin can create departments and one login per department.
- Department user can submit a borrowable, assignable, or consumable request (separately).
- Admin can approve/reject those requests and release only when stock/asset is on hand.
- Admin can manually issue each type to **either** a department **or** a project, with a visible transaction code.
- Borrowable issues have a due date and can be returned; overdue is visible.
- Assignable issues have no due date and can be returned/unassigned to the custodian.
- A coded asset’s page shows a chronological custody story.
- A consumable’s page shows stock in (restock/adjust) and stock out (issues to department/project) with lot/cost detail.
- Consumables cannot be returned.
- Issue is blocked when the asset is already out or consumable qty is insufficient.
- `staff` cannot perform these mutations.
- No PO screens. No people CRUD. No mixed-type issue.

---

## 13. Open implementation choices (not product questions)

These do not need another product meeting. The implementer picks the smaller migration:

1. Custody: generalize `borrow_transactions` vs generalize `project_asset_assignments` (§6.3 — prefer generalizing borrow ledger).
2. Whether admin manual issue writes a request row with status `released` or only custody/movement rows plus a shared release header (§6.2).
3. Exact code prefixes (`REQ-`, `ISS-`, `LOG-`, `MOV-`) as long as they are unique and shown in the UI.
4. Whether `assets.current_holder` stays denormalized or is derived from open custody.

If any of those collide with a product rule in §2, §2 wins.
