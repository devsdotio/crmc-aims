"use client";

import { usePathname } from "next/navigation";
import { Menu, ChevronRight, User } from "lucide-react";
import { HeaderBibleVerse } from "@/components/header-bible-verse";

// ─── Route Metadata Map ──────────────────────────────────────────────────────

interface RouteMeta {
  title: string;
  subtitle: string;
  category: string;
}

const ROUTE_MAP: Record<string, RouteMeta> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Property & Inventory — at a glance",
    category: "Overview",
  },
  "/borrow-requests": {
    title: "Requests",
    subtitle: "Borrow, assignment, and supply request queues",
    category: "Operations",
  },
  "/assets": {
    title: "Assets Inventory",
    subtitle: "Manage fixed assets, serial numbers, and equipment records",
    category: "Operations",
  },
  "/borrow-log": {
    title: "Custody Log",
    subtitle: "Borrowed and assigned asset custody — return or undo",
    category: "Logs & History",
  },
  "/issue-history": {
    title: "Issue History",
    subtitle: "Consumable supply issues and MOV transaction codes",
    category: "Logs & History",
  },
  "/consumable-requests": {
    title: "Requests",
    subtitle: "Borrow, assignment, and supply request queues",
    category: "Operations",
  },
  "/maintenance-logs": {
    title: "Maintenance Logs",
    subtitle: "Condition flags, inspections, and repair resolutions",
    category: "Logs & History",
  },
  "/purchase-orders": {
    title: "Purchase Orders",
    subtitle: "Intake lot batches, supplier invoices, and cost ledger",
    category: "Operations",
  },
  "/vouchers": {
    title: "Disbursement Vouchers",
    subtitle: "Custodian disbursement records for purchasing items and settling orders",
    category: "Operations",
  },
  "/consumables": {
    title: "Inventory",
    subtitle: "Monitor stock quantities and minimum threshold alerts",
    category: "Operations",
  },
  "/users": {
    title: "Users",
    subtitle: "Manage custodian permissions and system accounts",
    category: "Administration",
  },
  "/categories": {
    title: "Category Management",
    subtitle: "Configure asset and consumable supply categories",
    category: "Administration",
  },
  "/departments": {
    title: "Departments",
    subtitle: "Manage offices and custodian destination departments",
    category: "Administration",
  },
  "/reports": {
    title: "Reports & Analytics",
    subtitle: "Institutional reports, inventory audits, and export tools",
    category: "Administration",
  },
  "/profile": {
    title: "User Profile",
    subtitle: "Manage your personal account settings and security password",
    category: "Account",
  },
  "/settings": {
    title: "User Profile",
    subtitle: "Manage your personal account settings and security password",
    category: "Account",
  },
  "/borrower-db": {
    title: "Borrower Portal",
    subtitle: "Department equipment & supplies portal",
    category: "Borrower",
  },
  "/borrower-db/dashboard": {
    title: "My Dashboard",
    subtitle: "Active borrowings, custody overview, and department requests",
    category: "Overview",
  },
  "/borrower-db/requests": {
    title: "My Requests",
    subtitle: "Track status of borrow and supply requisition requests",
    category: "Operations",
  },
  "/borrower-db/history": {
    title: "Borrow History",
    subtitle: "Asset custody logs, active loans, and return audit trails",
    category: "Logs & History",
  },
  "/borrower-db/requisition": {
    title: "Requisition Slip",
    subtitle: "Submit a new supply or asset requisition request",
    category: "Operations",
  },
};

interface GlobalHeaderProps {
  onMobileMenuOpen: () => void;
  /** Display name from the signed-in profile (sidebar/header identity). */
  userName?: string;
  /** Role title label, e.g. "Admin", "Staff", "Superadmin". */
  userRoleLabel?: string;
}

export default function GlobalHeader({
  onMobileMenuOpen,
  userName,
  userRoleLabel = "—",
}: GlobalHeaderProps) {
  const pathname = usePathname();

  const currentRoute = ROUTE_MAP[pathname] || {
    title: "CRMC AIMS",
    subtitle: "Asset & Inventory Management System",
    category: "System",
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-[#E3E5EC] shrink-0 z-20 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-bg-subtle hover:text-text transition-colors cursor-pointer"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="font-medium">{currentRoute.category}</span>
            <ChevronRight className="w-3 h-3 text-[#9AA0AC]" />
            <span className="font-semibold text-text truncate">
              {currentRoute.title}
            </span>
          </div>
          <p className="text-xs text-text-secondary truncate hidden sm:block">
            {currentRoute.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Dynamic Bible Verse Section */}
        <HeaderBibleVerse />

        <div
          className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-full bg-bg-subtle border border-[#E3E5EC] max-w-56"
          title={userName ? `${userName} · ${userRoleLabel}` : userRoleLabel}
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2A3260] text-white text-[10px] font-bold shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 pr-1">
            <span className="block text-xs font-semibold text-text truncate leading-tight">
              {userName ?? userRoleLabel}
            </span>
            {userName ? (
              <span className="block text-[10px] font-medium text-[#6B7280] truncate leading-tight">
                {userRoleLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
