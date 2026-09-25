"use client";

import { Suspense } from "react";
import { PettyCashView } from "@/components/petty-cash/petty-cash-view";

export default function DisbursementsPettyCashPage() {
  return (
    <Suspense fallback={null}>
      <PettyCashView />
    </Suspense>
  );
}
