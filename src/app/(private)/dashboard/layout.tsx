import { ReactNode } from "react";

/**
 * Dashboard page layout.
 *
 * Auth gating (JWT verify + cached profile + role check) is handled entirely
 * by the parent `(private)/layout.tsx`. No redundant RouteGuard needed here —
 * adding one would trigger a full Supabase auth round-trip + DB query on every
 * navigation to /dashboard, causing skeleton flashes and perceived page reloads.
 */
export default function DashboardPageLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
