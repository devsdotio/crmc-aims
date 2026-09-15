"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import GlobalHeader from "@/components/global-header";
import { cn } from "@/lib/utils";
import { useMeQuery } from "@/features/users/client";
import { useDashboardSidebarSummaryQuery } from "@/features/dashboard/client/use-dashboard";
import { ROLE_DEFINITIONS } from "@/constants/roles";
import { SandboxVisibilityProvider } from "@/components/providers/sandbox-visibility-context";

import type { UserRole } from "@/types/users";

interface DashboardLayoutProps {
  children: React.ReactNode;
  initialProfile?: {
    name: string;
    email: string;
    role: UserRole;
  };
}

export default function DashboardLayout({
  children,
  initialProfile,
}: DashboardLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Defer shell metrics until after page data starts — frees the DB pool for
  // /api/assets, /api/consumables, etc. (sidebar badges are non-critical).
  const [shellReady, setShellReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShellReady(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  // Prefer SSR profile labels; soft-refresh /api/me after first paint.
  const { data: me, isLoading: meLoading } = useMeQuery({
    enabled: shellReady,
  });
  const { data: summary } = useDashboardSidebarSummaryQuery({
    enabled: shellReady,
  });

  const userName =
    me?.name ??
    initialProfile?.name ??
    (meLoading ? "Loading…" : "Unknown user");
  const userEmail = me?.email ?? initialProfile?.email ?? "";

  const currentRole = me?.role ?? initialProfile?.role;
  const userRoleLabel = currentRole
    ? ROLE_DEFINITIONS[currentRole].title
    : meLoading
      ? "…"
      : "—";

  const pendingCount = summary?.pendingApprovals ?? 0;
  const overdueCount = summary?.overdueAssets ?? 0;
  const lowStockCount = summary?.lowStockItems ?? 0;

  return (
    <SandboxVisibilityProvider role={currentRole}>
    <div className="flex h-full w-full overflow-hidden bg-[#F2F3F7] text-[#1B2140] print:h-auto print:overflow-visible print:bg-white">
      <div className="hidden md:block h-full shrink-0 print:hidden no-print">
        <Sidebar
          userName={userName}
          userEmail={userEmail}
          userRole={currentRole}
          pendingCount={pendingCount}
          overdueCount={overdueCount}
          lowStockCount={lowStockCount}
        />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-in-out print:hidden no-print",
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      >
        <div
          onClick={() => setIsMobileOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        <div
          className={cn(
            "absolute inset-y-0 left-0 w-64 bg-primary transition-transform duration-300 ease-in-out shadow-2xl flex flex-col",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar
            className="border-r-0 w-full h-full"
            userName={userName}
            userEmail={userEmail}
            userRole={currentRole}
            pendingCount={pendingCount}
            overdueCount={overdueCount}
            lowStockCount={lowStockCount}
          />
        </div>
      </div>

      <div
        className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden bg-[#F2F3F7] text-[#1B2140] print:h-auto print:overflow-visible print:bg-white"
        data-theme="light"
      >
        <div className="print:hidden no-print">
          <GlobalHeader
            onMobileMenuOpen={() => setIsMobileOpen(true)}
            userName={userName}
            userRoleLabel={userRoleLabel}
          />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 bg-[#F2F3F7] focus:outline-hidden print:overflow-visible print:h-auto print:p-0 print:bg-white">
          {children}
        </main>
      </div>
    </div>
    </SandboxVisibilityProvider>
  );
}
