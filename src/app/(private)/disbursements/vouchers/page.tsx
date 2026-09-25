"use client";

import { Suspense } from "react";
import { VouchersView } from "@/components/vouchers/vouchers-view";

export default function DisbursementsVouchersPage() {
  return (
    <Suspense fallback={null}>
      <VouchersView />
    </Suspense>
  );
}
