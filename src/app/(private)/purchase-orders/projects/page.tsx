"use client";

import React from "react";
import { PurchaseOrdersView } from "@/components/purchase-orders/purchase-orders-view";

export default function ProjectPurchaseOrdersPage() {
  return <PurchaseOrdersView categoryScope="projects" />;
}
