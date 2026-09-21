# Project Overview — CRMC Property Custodian Inventory System

## What This Is

A web system for the Property Custodian's office at CRMC to manage institutional assets and consumable supplies — tracking items as they're borrowed and returned, keeping consumable stock counts accurate, and giving departments a simple way to request items without paper forms.

It replaces manual/paper-based tracking with a system that borrowing departments can access directly, while the custodian's office retains full visibility and control over every release.

## Who Uses It

- **Borrowers** (departments/individuals) — no account. They fill in a public form each time: name, department, contact, and what they want to borrow/request.
- **Property Custodian** — the primary admin. Confirms/releases requests, scans assets, manages stock, reviews logs.
- **Assistant Staff** — same admin access as the custodian, for day-to-day handling.

## Two Kinds of Items

1. **Coded Assets** — individually trackable (equipment, tools, furniture). Each gets a unique QR code. Tracked per physical unit as it's borrowed and returned.
2. **Consumables** — bulk supplies (bond paper, etc.), tracked by quantity, not per-unit. No code, but stock count must stay accurate.

Both go through the same public request form; they're just handled differently once submitted.

## Core Workflows

**Borrowing a coded asset:**
Borrower submits form with expected return date → request lands in custodian's queue → custodian confirms and releases by scanning the asset's QR code (phone camera, no dedicated hardware — manual "mark as released" fallback always available) → on return, asset is scanned back in and its condition is logged (good/damaged/needs repair) → if not returned by the expected date, it's flagged **overdue**.

**Requesting consumables:**
Borrower submits form with item + quantity → request lands in queue, stock is **not yet deducted** → custodian confirms/releases → **only then** is quantity deducted from stock → if stock drops below a threshold, a **low-stock alert** fires.

## Key Features

- Public request form, no login required for borrowers
- QR-code generation/scanning for coded assets, with manual fallback
- Confirmation step before every release (assets and consumables alike)
- Borrow logs with timestamps, borrower info, department
- Overdue tracking for assets past their expected return date
- Condition/damage logging on return
- Consumable stock levels with low-stock alerts
- Admin dashboard: current stock, active borrows, overdue items at a glance
- Multi-user internal access (custodian + assistant staff)

## Non-Goals (current scope)

- No offline mode — assumes online access throughout
- No borrower accounts/login
- No dedicated barcode scanner hardware — phone-camera QR scanning only

## Tech Stack

- **Frontend/Framework:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Database/ORM:** Supabase (Postgres, free tier) + drizzle-orm / drizzle-kit
- **Auth:** Supabase Auth (via @supabase/ssr) — for custodian/staff login only; borrowers never authenticate
- **Hosting:** Vercel (free tier)
- **API docs:** Swagger (via `next-swagger-doc` + `swagger-ui-react`)

See `ARCHITECTURE.md` for folder structure and conventions, `DATA_MODEL.md` for the schema, and `API_REFERENCE.md` for endpoints.