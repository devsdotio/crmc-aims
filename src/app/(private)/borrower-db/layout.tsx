import { BorrowerPortalProvider } from "@/components/borrower-db/context";
import { BorrowerRealtimeProvider } from "@/components/borrower-db/borrower-realtime-provider";
import { ReactNode } from "react";

/**
 * Borrower portal shell.
 *
 * Auth + role gating is handled by the parent `(private)/layout.tsx`
 * (JWT claims + cached profile). Do not wrap with RouteGuard — that would
 * re-hit Supabase Auth + Postgres on every navigation and surface opaque
 * connection timeouts as "Failed query" errors.
 */
export default function BorrowerDbLayout({ children }: { children: ReactNode }) {
  return (
    <BorrowerPortalProvider>
      <BorrowerRealtimeProvider>{children}</BorrowerRealtimeProvider>
    </BorrowerPortalProvider>
  );
}
