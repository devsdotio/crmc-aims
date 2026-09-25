"use client";

import { usePathname } from "next/navigation";
import { Menu, ChevronRight } from "lucide-react";
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
  "/borrow-requests/borrow": {
    title: "Borrow Requests",
    subtitle: "Temporary equipment loans awaiting review and release",
    category: "Operations",
  },
  "/borrow-requests/assign": {
    title: "Assign Requests",
    subtitle: "Long-term department assignment requests",
    category: "Operations",
  },
  "/borrow-requests/supplies": {
    title: "Supply Requests",
    subtitle: "Consumable requisitions awaiting approval and issue",
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
  "/audit-logs": {
    title: "Audit Trail",
    subtitle: "Critical administrative activity and operational traces",
    category: "Logs & History",
  },
  "/audit-trails": {
    title: "Audit Trails",
    subtitle: "Critical administrative activity and operational traces",
    category: "Logs & History",
  },
  "/purchase-orders": {
    title: "Purchase Orders",
    subtitle: "Intake lot batches, supplier invoices, and cost ledger",
    category: "Operations",
  },
  "/purchase-orders/asset": {
    title: "Asset Purchase Orders",
    subtitle: "Capital equipment lots, supplier invoices, and receiving",
    category: "Operations",
  },
  "/purchase-orders/assets": {
    title: "Asset Purchase Orders",
    subtitle: "Capital equipment lots, supplier invoices, and receiving",
    category: "Operations",
  },
  "/purchase-orders/supplies": {
    title: "Supplies Purchase Orders",
    subtitle: "Consumable supply lots and vendor deliveries",
    category: "Operations",
  },
  "/purchase-orders/materials": {
    title: "Materials Purchase Orders",
    subtitle: "Project and warehouse material lots",
    category: "Operations",
  },
  "/purchase-orders/projects": {
    title: "Project Purchase Orders",
    subtitle: "Lots charged to custodial work units",
    category: "Operations",
  },
  "/purchase-orders/consumables": {
    title: "Consumable Purchase Orders",
    subtitle: "Supply and material intake lots",
    category: "Operations",
  },
  "/vouchers": {
    title: "Disbursement Vouchers",
    subtitle: "Custodian disbursement records for purchasing items and settling orders",
    category: "Operations",
  },
  "/disbursements": {
    title: "Disbursements",
    subtitle: "Vouchers and petty cash for settling purchase orders",
    category: "Operations",
  },
  "/disbursements/vouchers": {
    title: "Disbursement Vouchers",
    subtitle: "Custodian disbursement records for purchasing items and settling orders",
    category: "Operations",
  },
  "/disbursements/petty-cash": {
    title: "Petty Cash",
    subtitle: "Micro-disbursements for immediate small expenses and urgent cash purchases",
    category: "Operations",
  },
  "/petty-cash": {
    title: "Petty Cash",
    subtitle: "Micro-disbursements for immediate small expenses and urgent cash purchases",
    category: "Operations",
  },
  "/suppliers": {
    title: "Suppliers",
    subtitle: "Vendor registry for purchase lots and disbursements",
    category: "Operations",
  },
  "/projects": {
    title: "Projects",
    subtitle: "Work units, material checkout, assigned assets, and expenses",
    category: "Operations",
  },
  "/platform": {
    title: "Platform Overview",
    subtitle: "Institution workspaces and platform governance",
    category: "Platform",
  },
  "/platform/tenants": {
    title: "Institutions & Tenants",
    subtitle: "Provision and manage institutional workspaces",
    category: "Platform",
  },
  "/consumables": {
    title: "Inventory",
    subtitle: "Monitor stock quantities and minimum threshold alerts",
    category: "Operations",
  },
  "/consumables/supplies": {
    title: "Supplies",
    subtitle: "Office and operating consumable stock",
    category: "Operations",
  },
  "/consumables/materials": {
    title: "Materials",
    subtitle: "Project and warehouse material stock",
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
  "/reports/assets": {
    title: "Asset Reports",
    subtitle: "Capital register, valuation, and custody status",
    category: "Administration",
  },
  "/reports/consumables": {
    title: "Consumable Reports",
    subtitle: "Stock valuation, burn rate, and low-stock alerts",
    category: "Administration",
  },
  "/reports/projects": {
    title: "Project Reports",
    subtitle: "Assigned assets, consumed stock, and project cost rollup",
    category: "Administration",
  },
  "/reports/departments": {
    title: "Department Reports",
    subtitle: "Assets, issued stock, and activity by office",
    category: "Administration",
  },
  "/reports/maintenance": {
    title: "Maintenance Reports",
    subtitle: "Work orders, MTTR, and repair spend",
    category: "Administration",
  },
  "/reports/purchase-orders": {
    title: "Procurement Reports",
    subtitle: "Open orders, deliveries, and spend window",
    category: "Administration",
  },
  "/reports/requests": {
    title: "Request Reports",
    subtitle: "Borrow, assignment, and supply requisition volume",
    category: "Administration",
  },
  "/reports/print": {
    title: "Print Reports",
    subtitle: "Printable institutional report layouts",
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
  "/borrower-db/assets": {
    title: "Inventory",
    subtitle: "Assets currently borrowed or assigned to your department",
    category: "Operations",
  },
  "/borrower-db/supplies": {
    title: "Issued Supplies",
    subtitle: "Supplies released to your department",
    category: "Operations",
  },
  "/borrower-db/materials": {
    title: "Issued Materials",
    subtitle: "Materials released to your department",
    category: "Operations",
  },
  "/borrower-db/inventory": {
    title: "My Inventory",
    subtitle: "Assets currently borrowed or assigned to your department",
    category: "Overview",
  },
  "/borrower-db/requests": {
    title: "My Requests",
    subtitle: "Track status of borrow, assignment, and supply requests",
    category: "Operations",
  },
  "/borrower-db/requests/borrow": {
    title: "Borrow Requests",
    subtitle: "Temporary equipment loans with a return due date",
    category: "Operations",
  },
  "/borrower-db/requests/assignment": {
    title: "Assignment Requests",
    subtitle: "Long-term department equipment with open custody",
    category: "Operations",
  },
  "/borrower-db/requests/supplies": {
    title: "Supply Requests",
    subtitle: "Consumable requisitions issued from stock",
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
}

function resolveRouteMeta(pathname: string): RouteMeta {
  const exact = ROUTE_MAP[pathname];
  if (exact) return exact;

  let best: RouteMeta | null = null;
  let bestLen = 0;
  for (const [path, meta] of Object.entries(ROUTE_MAP)) {
    if (pathname.startsWith(`${path}/`) && path.length > bestLen) {
      best = meta;
      bestLen = path.length;
    }
  }

  return (
    best ?? {
      title: "AIMS",
      subtitle: "Asset & Inventory Management System",
      category: "System",
    }
  );
}

export default function GlobalHeader({ onMobileMenuOpen }: GlobalHeaderProps) {
  const pathname = usePathname();

  const currentRoute = resolveRouteMeta(pathname);

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

      <div className="flex items-center shrink-0 min-w-0 pl-4">
        <HeaderBibleVerse />
      </div>
    </header>
  );
}
