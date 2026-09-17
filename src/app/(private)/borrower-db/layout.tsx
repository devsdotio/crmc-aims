import { BorrowerPortalProvider } from "@/components/borrower-db/context";
import { BorrowerRealtimeProvider } from "@/components/borrower-db/borrower-realtime-provider";
import { RouteGuard } from "@/components/guards/RouteGuard";
import { ReactNode } from "react";

export default function BorrowerDbLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard config={{ allowedRoles: ['borrower'] }}>
      <BorrowerPortalProvider>
        <BorrowerRealtimeProvider>{children}</BorrowerRealtimeProvider>
      </BorrowerPortalProvider>
    </RouteGuard>
  );
}
