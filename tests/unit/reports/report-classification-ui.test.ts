import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/reports/consumables",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

import {
  ClassificationFilterPills,
  ConsumableClassificationBadge,
  normalizeBadgeKind,
} from "@/components/reports/consumable-classification-badge";
import { ReportTimeframeProvider } from "@/components/reports/report-timeframe-context";
import { ReportLayoutNav } from "@/components/reports/report-layout-nav";
import { formatDonutCenterTotal } from "@/components/reports/breakdown-donut-chart";
import { ConsumablesPrintableReport } from "@/components/reports/print/ConsumablesPrintableReport";
import { ExecutivePrintableReport } from "@/components/reports/print/ExecutivePrintableReport";
import { ProcurementPrintableReport } from "@/components/reports/print/ProcurementPrintableReport";
import { IndividualConsumablePrintableReport } from "@/components/reports/print/individual/IndividualConsumablePrintableReport";
import { IndividualDepartmentPrintableReport } from "@/components/reports/print/individual/IndividualDepartmentPrintableReport";
import { IndividualProjectPrintableReport } from "@/components/reports/print/individual/IndividualProjectPrintableReport";
import { IndividualAssetPrintableReport } from "@/components/reports/print/individual/IndividualAssetPrintableReport";
import type {
  ConsumableStockRow,
  ExecutiveKpiSummary,
  PurchaseOrderRow,
} from "@/types/reports";

const SAMPLE_SUPPLY_ROW: ConsumableStockRow = {
  id: "s1",
  itemCode: "SUP-101",
  name: "Short Bond Paper",
  category: "Office Paper",
  classification: "supply",
  unit: "ream",
  currentQty: 25,
  reservedQty: 5,
  availableQty: 20,
  minThreshold: 10,
  location: "Store Room A",
  unitCost: 160,
  stockValuation: 4000,
  usage30d: 8,
  usage90d: 22,
  estimatedDaysRemaining: 93,
  isLowStock: false,
  lastRestocked: "2026-10-01",
};

const SAMPLE_MATERIAL_ROW: ConsumableStockRow = {
  id: "m1",
  itemCode: "MAT-202",
  name: "Marine Plywood 3/4",
  category: "Carpentry Materials",
  classification: "material",
  unit: "sheet",
  currentQty: 4,
  reservedQty: 1,
  availableQty: 3,
  minThreshold: 6,
  location: "Yard Warehouse",
  unitCost: 950,
  stockValuation: 3800,
  usage30d: 6,
  usage90d: 14,
  estimatedDaysRemaining: 20,
  isLowStock: true,
  lastRestocked: "2026-10-02",
};

describe("reports & print UI separation for Supplies vs Materials", () => {
  it("normalizes classification badges and formats donut center totals cleanly", () => {
    expect(normalizeBadgeKind("material")).toBe("material");
    expect(normalizeBadgeKind("MIXED")).toBe("mixed");
    expect(normalizeBadgeKind("service")).toBe("miscellaneous");
    expect(normalizeBadgeKind(null)).toBe("supply");

    const supplyBadge = renderToStaticMarkup(
      React.createElement(ConsumableClassificationBadge, { classification: "supply" })
    );
    const materialBadge = renderToStaticMarkup(
      React.createElement(ConsumableClassificationBadge, { classification: "material" })
    );
    const mixedBadge = renderToStaticMarkup(
      React.createElement(ConsumableClassificationBadge, { classification: "mixed" })
    );

    expect(supplyBadge).toContain("Supply");
    expect(materialBadge).toContain("Material");
    expect(mixedBadge).toContain("Mixed (Supplies + Materials)");

    expect(formatDonutCenterTotal(1_250_000, "value")).toBe("₱1.3M");
    expect(formatDonutCenterTotal(4500, "value")).toBe("₱4.5k");
    expect(formatDonutCenterTotal(42, "count")).toBe("42");

    const pills = renderToStaticMarkup(
      React.createElement(ClassificationFilterPills, {
        value: "material",
        onChange: () => undefined,
        options: [
          { id: "all", label: "All", count: 12 },
          { id: "supply", label: "Supplies", count: 7 },
          { id: "material", label: "Materials", count: 5 },
        ],
      })
    );
    expect(pills).toContain('aria-pressed="true"');
    expect(pills).toContain("Materials");
  });

  it("removes Requests & Requisitions tab from ReportLayoutNav while keeping Consumables and Purchase Orders", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ReportTimeframeProvider,
        null,
        React.createElement(ReportLayoutNav)
      )
    );
    expect(html).toContain("/reports/consumables");
    expect(html).toContain("Consumables");
    expect(html).toContain("/reports/purchase-orders");
    expect(html).toContain("Purchase Orders");
    expect(html).not.toContain("/reports/requests");
    expect(html).not.toContain("Requisitions");
  });

  it("renders ConsumablesPrintableReport in two separated parts with zero [TO BE FILLED] stubs", () => {
    const bothHtml = renderToStaticMarkup(
      React.createElement(ConsumablesPrintableReport, {
        data: [SAMPLE_SUPPLY_ROW, SAMPLE_MATERIAL_ROW],
        canViewCosts: true,
        generatedAt: new Date("2026-10-15T08:00:00Z"),
      })
    );
    expect(bothHtml).toContain("Part I — Consumable Supplies");
    expect(bothHtml).toContain("Part II — Consumable Materials");
    expect(bothHtml).toContain("Short Bond Paper");
    expect(bothHtml).toContain("Marine Plywood 3/4");
    expect(bothHtml).toContain("CRMC-CUST-CSM-");
    expect(bothHtml).not.toContain("[TO BE FILLED]");
    expect(bothHtml).not.toContain("Grand Total Supplies Count:");
    expect(bothHtml).not.toContain("General Supplies");

    const suppliesOnlyHtml = renderToStaticMarkup(
      React.createElement(ConsumablesPrintableReport, {
        data: [SAMPLE_SUPPLY_ROW, SAMPLE_MATERIAL_ROW],
        filters: {
          page: 1,
          pageSize: 200,
          sortOrder: "desc",
          classification: "supply",
          includeSandbox: false,
        },
        generatedAt: new Date("2026-10-15T08:00:00Z"),
      })
    );
    expect(suppliesOnlyHtml).toContain("Part I — Consumable Supplies");
    expect(suppliesOnlyHtml).not.toContain("Part II — Consumable Materials");
    expect(suppliesOnlyHtml).toContain("CRMC-CUST-SUP-");

    const materialsOnlyHtml = renderToStaticMarkup(
      React.createElement(ConsumablesPrintableReport, {
        data: [SAMPLE_SUPPLY_ROW, SAMPLE_MATERIAL_ROW],
        filters: {
          page: 1,
          pageSize: 200,
          sortOrder: "desc",
          classification: "material",
          includeSandbox: false,
        },
        generatedAt: new Date("2026-10-15T08:00:00Z"),
      })
    );
    expect(materialsOnlyHtml).toContain("Part II — Consumable Materials");
    expect(materialsOnlyHtml).not.toContain("Part I — Consumable Supplies");
    expect(materialsOnlyHtml).toContain("CRMC-CUST-MAT-");
  });

  it("splits Supplies & Materials and removes Requisitions in ExecutivePrintableReport", () => {
    const summary: ExecutiveKpiSummary = {
      assets: { totalCount: 10, activeCount: 9, inRepairCount: 1, totalValue: 100000 },
      consumables: {
        totalItems: 12,
        lowStockCount: 3,
        totalValuation: 55000,
        monthBurnRateValue: 8000,
        suppliesCount: 7,
        materialsCount: 5,
        suppliesLowStockCount: 1,
        materialsLowStockCount: 2,
        suppliesValuation: 20000,
        materialsValuation: 35000,
        suppliesBurnRateValue: 3000,
        materialsBurnRateValue: 5000,
      },
      procurement: { openOrdersCount: 2, totalSpend30d: 40000, pendingDeliveryCount: 1 },
      requests: { pendingCount: 3, fulfilledThisMonth: 4, avgApprovalHours: 6 },
      maintenance: { activeIssuesCount: 1, resolvedThisMonth: 2, totalRepairSpend30d: 5000, avgMttrDays: 1.5 },
      charts: {
        monthlySpendTrend: [],
        categoryDistribution: [],
        statusDistribution: [],
      },
      canViewCosts: true,
    };

    const html = renderToStaticMarkup(
      React.createElement(ExecutivePrintableReport, { data: summary })
    );
    expect(html).toContain("2A. Consumable Supplies");
    expect(html).toContain("2B. Consumable Materials");
    expect(html).not.toContain("Department Requisitions");
    expect(html).not.toContain("Active Requisitions");
  });

  it("recognizes delivered purchase orders and renders classification tags in ProcurementPrintableReport", () => {
    const orders: PurchaseOrderRow[] = [
      {
        poNumber: "PO-2026-001",
        supplierName: "Office Depot",
        status: "delivered",
        itemType: "consumable",
        classification: "supply",
        itemsPreview: "Bond Paper",
        lineItemCount: 1,
        totalQuantity: 10,
        totalAmount: 1500,
        purchasedOn: "2026-10-01",
        approvedAt: "2026-10-02",
        deliveredAt: "2026-10-03",
        leadTimeDays: 2,
      },
      {
        poNumber: "PO-2026-002",
        supplierName: "BuildCo",
        status: "ordered",
        itemType: "consumable",
        classification: "material",
        itemsPreview: "Portland Cement",
        lineItemCount: 1,
        totalQuantity: 15,
        totalAmount: 4500,
        purchasedOn: "2026-10-05",
        approvedAt: "2026-10-06",
        deliveredAt: null,
        leadTimeDays: null,
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ProcurementPrintableReport, { data: orders, canViewCosts: true })
    );
    expect(html).toContain("SUPPLY");
    expect(html).toContain("MATERIAL");
    expect(html).toContain("1 of 2 orders delivered");
  });

  it("renders untruncated separated dossiers in Individual*PrintableReport components", () => {
    const indConsumable = renderToStaticMarkup(
      React.createElement(IndividualConsumablePrintableReport, {
        item: {
          id: "c1",
          itemCode: "MAT-900",
          name: "PVC Pipe 2in",
          classification: "material",
          category: "Plumbing",
          unit: "length",
          currentQty: 20,
          minThreshold: 5,
        },
      })
    );
    expect(indConsumable).toContain("[CONSUMABLE MATERIAL]");
    expect(indConsumable).toContain("MAT-SKU-MAT-900");
    expect(indConsumable).toContain("print-dossier-portrait");
    expect(indConsumable).not.toContain("General Supply");

    const assets12 = Array.from({ length: 12 }, (_, idx) => ({
      id: `ast-${idx + 1}`,
      assetCode: `AST-${idx + 1}`,
      name: `Workstation ${idx + 1}`,
      status: "active",
    }));
    const items12 = Array.from({ length: 12 }, (_, idx) => ({
      id: `itm-${idx + 1}`,
      skuCode: idx % 2 === 0 ? `SUP-${idx + 1}` : `MAT-${idx + 1}`,
      name: idx % 2 === 0 ? `Supply Line ${idx + 1}` : `Material Line ${idx + 1}`,
      classification: idx % 2 === 0 ? "supply" : "material",
      quantity: 2,
      unit: "pcs",
      spendValue: 100,
    }));

    const indDept = renderToStaticMarkup(
      React.createElement(IndividualDepartmentPrintableReport, {
        department: {
          id: "d1",
          name: "Engineering",
          assignedAssets: assets12,
          consumedSupplies: items12,
        },
      })
    );
    expect(indDept).toContain("3A. Consumable Supplies Dispatched");
    expect(indDept).toContain("3B. Operational &amp; Project Materials Dispatched");
    expect(indDept).toContain("Workstation 12");
    expect(indDept).toContain("Supply Line 11");
    expect(indDept).toContain("Material Line 12");
    expect(indDept).toContain("print-dossier-portrait");

    const indProj = renderToStaticMarkup(
      React.createElement(IndividualProjectPrintableReport, {
        project: {
          id: "p1",
          name: "Lab Upgrade",
          consumedSupplies: [
            {
              id: "1",
              name: "Whiteboard Marker",
              classification: "supply",
              source: "request",
              quantity: 5,
              amount: 250,
            },
            {
              id: "2",
              name: "Aluminum Framing",
              classification: "material",
              source: "direct_issue",
              quantity: 4,
              amount: 3200,
            },
            {
              id: "3",
              name: "Welding Contractor",
              category: "labor",
              source: "miscellaneous",
              quantity: 1,
              amount: 5000,
            },
          ],
        },
      })
    );
    expect(indProj).toContain("3A. Consumable Supplies Dispatched");
    expect(indProj).toContain("3B. Operational &amp; Project Materials Dispatched");
    expect(indProj).toContain("3C. Direct Labor &amp; Services (Miscellaneous)");
    expect(indProj).toContain("print-dossier-portrait");

    const indAsset = renderToStaticMarkup(
      React.createElement(IndividualAssetPrintableReport, {
        asset: { id: "a1", assetCode: "AST-01", name: "Generator", value: 50000 },
        tco: { purchaseCost: 50000, maintenanceCost: 2000, consumablesCost: 500, totalCostOfOwnership: 52500 },
        canViewCosts: true,
      })
    );
    expect(indAsset).toContain("Consumables used:");
    expect(indAsset).not.toContain("Supplies used:");
    expect(indAsset).toContain("print-dossier-portrait");
    expect(indAsset).not.toContain("size: letter portrait");
    expect(indAsset).not.toContain("padding: 10mm 12mm");
    expect(indAsset).toContain("print:p-0");

    expect(indDept).toContain("Active Projects &amp; Work Orders");
    expect(indDept).toContain("print:max-w-none");
    expect(indDept).toContain("print:overflow-visible");
    expect(indDept).not.toContain('class="text-[9.5px] font-bold uppercase tracking-wider text-black truncate"');
  });

  it("removes hardcoded 14in @page locks and double print margins across aggregate & custom print views", () => {
    const aggHtml = renderToStaticMarkup(
      React.createElement(ConsumablesPrintableReport, {
        data: [SAMPLE_SUPPLY_ROW, SAMPLE_MATERIAL_ROW],
        canViewCosts: true,
        generatedAt: new Date("2026-10-15T08:00:00Z"),
      })
    );
    expect(aggHtml).not.toContain("size: 14in 8.5in");
    expect(aggHtml).not.toContain("display: flex;");
    expect(aggHtml).toContain("print:overflow-visible");
  });
});
