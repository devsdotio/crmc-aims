"use client";

import React from "react";
import { PurchaseOrdersView } from "@/components/purchase-orders/purchase-orders-view";

export default function SupplyPurchaseOrdersPage() {
  return <PurchaseOrdersView categoryScope="supplies" />;
}
