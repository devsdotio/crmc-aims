"use client";

import React, { Suspense } from "react";
import { PurchaseOrdersView } from "@/components/purchase-orders/purchase-orders-view";

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={null}>
      <PurchaseOrdersView categoryScope="all" />
    </Suspense>
  );
}

