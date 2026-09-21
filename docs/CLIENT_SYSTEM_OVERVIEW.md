# CRMC-AIMS — Client Overview

**CRMC Asset & Inventory Management System (AIMS)** is a web application for the **Property Custodian’s office** at CRMC. It replaces paper-based tracking with a single place to manage institutional equipment, consumable supplies, departmental requests, and accountability logs.

---

## What problem it solves

| Before | With AIMS |
|--------|-----------|
| Manual/paper borrow slips | Digital request queues with approve/reject audit trail |
| Unclear who has what equipment | Live custody: holder, due date, overdue flags |
| Consumable stock counted loosely | Quantity + **supplier batch (lot)** tracking with unit cost |
| No department cost visibility on supplies | Release cost frozen per lot → attributable to requesting department |
| Scattered logs | Borrow log, requisition history, maintenance, audit trail |

---

## Who uses it

| User | Access | Main actions |
|------|--------|--------------|
| **Department staff / borrowers** | Borrower portal (login) | Submit borrow or requisition requests; view own history |
| **Custodian / admin staff** | Staff app (login) | Approve, release, return; manage inventory; run reports |
| **System admin** | Staff app | Users, roles, categories, suppliers, projects |

---

## Three types of inventory

Everything in the system falls into one of three paths:

| Type | Examples | How it works | Returned? |
|------|----------|--------------|-----------|
| **Borrowable** | Laptop, projector, AV equipment | Short-term loan with **due date**; one QR-coded unit per item | **Yes** |
| **Assignable** | Long-term project equipment | Assigned to a **project** until returned/unassigned | **Yes** (end of project) |
| **Consumable** | Bond paper, ink, office supplies | Issued by **quantity**; tracked by supplier **lot/batch** | **No** (consumed) |

**Consumable detail (important):**  
Same product (e.g. A4 bond paper) can come from **multiple suppliers** at different prices. On release, the custodian picks **which lot** to pull from so stock and department expense stay accurate.

---

## Main modules (features)

### Operations (day-to-day)

| Module | Purpose |
|--------|---------|
| **Dashboard** | Pending requests, low stock, overdue borrows, quick stats |
| **Borrow Requests** | Queue for **borrowable assets** — approve → release → return |
| **Requisitions** | Queue for **consumables** (multi-item) — approve → release from lots |
| **Assets** | Registry of coded equipment (QR, status, holder, maintenance) |
| **Inventory** | Consumable catalog, restock, adjust stock, direct lot release |
| **Suppliers** | Vendor master list for purchase lots |
| **Projects** | Long-term **assignable** asset custody + project expenses |

### Administration

| Module | Purpose |
|--------|---------|
| **Users & Roles** | Staff accounts (admin, staff, borrower) |
| **Settings** | Categories, departments, system configuration |
| **Audit Logs** | Who did what, when (approvals, releases, adjustments) |
| **Maintenance Logs** | Repair / damage flags on assets |

### Borrower portal

| Module | Purpose |
|--------|---------|
| **My Dashboard** | Borrower summary |
| **My Requests** | Track pending / approved / rejected requests |
| **Requisition / Browse** | Request assets or consumables |
| **Borrow History** | Past borrows and returns |

---

## Sample flows (picture this)

### Flow A — Borrow equipment (short-term)

```
1. ICT staff requests a projector for 3 days (borrower portal)
2. Request appears in custodian → Borrow Requests → Pending
3. Custodian approves (or rejects with reason)
4. Custodian releases → records who picked it up → asset marked “out”
5. Due date = expected return date from request
6. On return → condition logged (good / damaged) → asset available again
7. If overdue → flagged on dashboard and borrow log
```

### Flow B — Request consumables (multi-item requisition)

```
1. Admin dept requests: 40 pcs A4 bond paper + 2 boxes pens (one request, multiple lines)
2. Request appears in custodian → Requisitions → Pending
3. Custodian approves (stock NOT deducted yet)
4. Custodian releases:
   - Picks supplier lot(s) per item (e.g. 30 from Supplier A lot, 10 from Supplier B lot)
   - Records who received the supplies
5. System deducts:
   - Lot remaining quantities
   - Overall item stock
   - Freezes cost per lot for department expense reporting
6. Full history: who requested, approved, released, from which lots
```

### Flow C — Assign equipment to a project (long-term)

```
1. Custodian assigns a coded asset to “Building Renovation” project
   (asset must be marked Assignable — not short-term borrow)
2. Asset shows project as current holder
3. When project ends → custodian returns asset from project
4. Optional: damage report → maintenance log or write-off with expense line
```

### Flow D — Restock consumables (inventory setup)

```
1. Custodian receives delivery: 500 pcs A4 bond paper from Supplier X @ ₱2.10/pc
2. Restock creates a purchase LOT (batch) linked to that supplier and cost
3. Item total stock increases; lot has its own remaining quantity
4. Future releases pull from specific lots → correct pricing per department
```

---

## Key business rules (client-facing)

1. **Nothing leaves without custodian approval** — request → approve → release.
2. **Consumable stock drops only on release**, not when the request is filed.
3. **Borrowable assets must return** by due date; overdue is visible to custodian.
4. **Assignable assets** use the project path, not the short-term borrow queue.
5. **Every release is logged** — requester, approver, releaser, lots used, timestamps.
6. **Low-stock alerts** when consumables fall below threshold.

---

## Technology (brief)

- Web app (browser-based; works on desktop and mobile camera for QR scan)
- Secure login for staff and borrowers
- Cloud database (PostgreSQL)
- API documented for future integrations (Swagger)

---

## Status note (for planning)

Core backend and admin UI are built for assets, consumables, borrow requests, and consumable requisitions. Borrower submission for multi-line consumable requisitions is the natural next integration step so requests flow end-to-end from department to custodian queue.

---

*Document prepared for client review — CRMC-AIMS system overview.*
