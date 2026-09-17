"use client";

import type { ReactNode } from "react";
import { useMeQuery } from "@/features/users/client";
import { useBorrowerRealtimeSync } from "@/hooks/use-borrower-realtime-sync";

export function BorrowerRealtimeProvider({ children }: { children: ReactNode }) {
  const { data: me } = useMeQuery();
  useBorrowerRealtimeSync({ enabled: Boolean(me?.id) });
  return <>{children}</>;
}
