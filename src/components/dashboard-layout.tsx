"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import GlobalHeader from "@/components/global-header";
import { cn } from "@/lib/utils";
import { useMeQuery } from "@/features/users/client";
import { userQueryKeys } from "@/features/users/client/query-keys";
import type { MeProfile } from "@/features/users/client/users-api";
import { useDashboardSidebarSummaryQuery } from "@/features/dashboard/client/use-dashboard";

import type { UserRole, UserStatus } from "@/types/users";

export type InitialShellProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department: string | null;
  departmentId: string | null;
  departmentCode: string | null;
  tenantId: string | null;
  dateAdded: string;
  lastActiveAt: string | null;
  createdByUserId: string | null;
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  initialProfile?: InitialShellProfile;
}

function toSeededMe(profile: InitialShellProfile): MeProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    status: profile.status,
    department: profile.department,
    departmentId: profile.departmentId,
    departmentCode: profile.departmentCode,
    tenantId: profile.tenantId,
    dateAdded: profile.dateAdded,
    lastActive: null,
    lastActiveAt: profile.lastActiveAt,
    createdByUserId: profile.createdByUserId,
  };
}

export default function DashboardLayout({
  children,
  initialProfile,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Defer shell metrics until after page data starts — frees the DB pool for
  // /api/assets, /api/consumables, etc. (sidebar badges are non-critical).
  const [shellReady, setShellReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShellReady(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  // Seed /api/me cache from SSR so the shell never waits on a cold identity fetch.
  useEffect(() => {
    if (!initialProfile) return;
    const existing = queryClient.getQueryData<MeProfile>(userQueryKeys.me());
    if (existing) return;
    queryClient.setQueryData(userQueryKeys.me(), toSeededMe(initialProfile));
  }, [initialProfile, queryClient]);

  const onPlatform = pathname === "/platform" || pathname.startsWith("/platform/");
  // Staff /dashboard already loads the full snapshot and seeds sidebar cache —
  // skip the duplicate ?scope=sidebar fetch on that page only.
  const onAdminDashboard = pathname === "/dashboard";

  // Soft-refresh /api/me after first paint (cache already seeded when SSR profile exists).
  const { data: me, isLoading: meLoading } = useMeQuery({
    enabled: shellReady,
  });
  const { data: summary } = useDashboardSidebarSummaryQuery({
    enabled: shellReady && !onPlatform && !onAdminDashboard,
  });

  const userName =
    me?.name ??
    initialProfile?.name ??
    (meLoading ? "Loading…" : "Unknown user");
  const userEmail = me?.email ?? initialProfile?.email ?? "";

  const currentRole = me?.role ?? initialProfile?.role;

  const pendingCount = summary?.pendingApprovals ?? 0;
  const pendingAssignCount = summary?.pendingAssignRequests ?? 0;
  const pendingBorrowCount = summary?.pendingBorrowRequests ?? 0;
  const pendingSupplyCount = summary?.pendingSupplyRequests ?? 0;
  const overdueCount = summary?.overdueAssets ?? 0;
  const lowStockCount = summary?.lowStockItems ?? 0;

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg-subtle text-text print:h-auto print:overflow-visible print:bg-white">
      <div className="hidden md:block h-full shrink-0 print:hidden no-print">
        <Sidebar
          userName={userName}
          userEmail={userEmail}
          userRole={currentRole}
          pendingCount={pendingCount}
          pendingAssignCount={pendingAssignCount}
          pendingBorrowCount={pendingBorrowCount}
          pendingSupplyCount={pendingSupplyCount}
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
            pendingAssignCount={pendingAssignCount}
            pendingBorrowCount={pendingBorrowCount}
            pendingSupplyCount={pendingSupplyCount}
            overdueCount={overdueCount}
            lowStockCount={lowStockCount}
          />
        </div>
      </div>

      <div
        className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden bg-bg-subtle text-text print:h-auto print:overflow-visible print:bg-white"
        data-theme="light"
      >
        <div className="print:hidden no-print">
          <GlobalHeader onMobileMenuOpen={() => setIsMobileOpen(true)} />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 bg-bg-subtle focus:outline-hidden print:overflow-visible print:h-auto print:p-0 print:bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
