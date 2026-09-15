export type ReportType =
  | "executive"
  | "assets"
  | "asset-drilldown"
  | "consumables"
  | "purchase-orders"
  | "requests"
  | "maintenance"
  | "projects"
  | "departments";

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface BaseReportFilters extends DateRangeFilter {
  search?: string;
  departmentId?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeSandbox?: boolean;
}

export interface PaginatedReportResponse<TData, TSummary> {
  data: TData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: TSummary;
  canViewCosts: boolean;
}

// ─── 1. Executive Report ──────────────────────────────────────────────────────

export interface ExecutiveKpiSummary {
  canViewCosts: boolean;
  assets: {
    totalCount: number;
    activeCount: number;
    inRepairCount: number;
    totalValue: number;
  };
  consumables: {
    totalItems: number;
    lowStockCount: number;
    totalValuation: number;
    monthBurnRateValue: number;
  };
  procurement: {
    openOrdersCount: number;
    totalSpend30d: number;
    pendingDeliveryCount: number;
  };
  requests: {
    pendingCount: number;
    fulfilledThisMonth: number;
    avgApprovalHours: number;
  };
  maintenance: {
    activeIssuesCount: number;
    resolvedThisMonth: number;
    avgMttrDays: number;
    totalRepairSpend30d: number;
  };
  charts: {
    categoryDistribution: Array<{ name: string; count: number; value: number }>;
    monthlySpendTrend: Array<{ month: string; procurement: number; maintenance: number }>;
    statusDistribution: Array<{ status: string; count: number }>;
  };
}

// ─── 2. Asset Register Report ─────────────────────────────────────────────────

export interface AssetRegisterRow {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  status: string;
  assignmentType: string;
  location: string;
  department: string | null;
  currentHolder: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  currentValue: number | null;
  supplierName: string | null;
  serialNumber: string | null;
  hasActiveMaintenance: boolean;
  lastUpdated: string;
}

export interface AssetRegisterSummary {
  totalAssets: number;
  totalValuation: number;
  activeCount: number;
  needsRepairCount: number;
  outOfServiceCount: number;
  retiredCount: number;
}

// ─── 3. Asset Drill-down Report ───────────────────────────────────────────────

export interface AssetDrilldownReport {
  asset: {
    id: string;
    assetCode: string;
    name: string;
    category: string;
    status: string;
    assignmentType: string;
    location: string;
    department: string | null;
    currentHolder: string | null;
    purchaseDate: string | null;
    value: number | null;
    supplierName: string | null;
    serialNumber: string | null;
    imageUrl: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  purchaseInfo: {
    lotCode: string | null;
    poNumber: string | null;
    purchasedOn: string | null;
    supplierName: string | null;
    unitCost: number | null;
    reference: string | null;
    receiptUrl: string | null;
  } | null;
  maintenanceHistory: Array<{
    id: string;
    logCode: string;
    condition: string;
    source: string;
    dateLogged: string;
    isResolved: boolean;
    resolutionDate: string | null;
    repairCost: number | null;
    loggedByName: string;
    resolvedByName: string | null;
    notes: string;
  }>;
  custodyHistory: Array<{
    id: string;
    logCode: string;
    borrowerName: string;
    borrowerEmail: string;
    department: string;
    purpose: string;
    status: string;
    borrowedAt: string;
    expectedReturnDate: string | null;
    returnedAt: string | null;
  }>;
  consumablesConsumed: Array<{
    id: string;
    consumableCode: string;
    consumableName: string;
    quantity: number;
    unit: string;
    unitCost: number | null;
    totalCost: number | null;
    usedAt: string;
    actorName: string;
  }>;
  tco: {
    purchaseCost: number;
    maintenanceCost: number;
    consumablesCost: number;
    totalCostOfOwnership: number;
  };
  canViewCosts: boolean;
}

// ─── 4. Consumables Stock & Usage Report ──────────────────────────────────────

export interface ConsumableStockRow {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  currentQty: number;
  reservedQty: number;
  availableQty: number;
  minThreshold: number;
  location: string;
  unitCost: number | null;
  stockValuation: number | null;
  usage30d: number;
  usage90d: number;
  estimatedDaysRemaining: number | null;
  isLowStock: boolean;
  lastRestocked: string | null;
}

export interface ConsumableStockSummary {
  totalSkus: number;
  lowStockItemsCount: number;
  totalInventoryValuation: number;
  totalDispatched30d: number;
  totalDispatchedValue30d: number;
  topConsumingDepartments?: Array<{
    departmentName: string;
    unitsConsumed: number;
    spendValue?: number;
  }>;
}

// ─── 5. Purchase Orders Report ────────────────────────────────────────────────

export interface PurchaseOrderRow {
  poNumber: string;
  supplierName: string;
  status: string;
  itemType: "consumable" | "asset" | "mixed";
  totalAmount: number | null;
  totalQuantity: number;
  lineItemCount: number;
  purchasedOn: string;
  approvedAt: string | null;
  deliveredAt: string | null;
  leadTimeDays: number | null;
  itemsPreview: string;
}

export interface PurchaseOrdersSummary {
  totalSpend: number;
  openOrdersCount: number;
  deliveredCount: number;
  avgLeadTimeDays: number;
  topSuppliers: Array<{ name: string; spend: number }>;
}

// ─── 6. Requests Report ───────────────────────────────────────────────────────

export interface RequestReportRow {
  id: string;
  requestCode: string;
  requestType: "asset_borrow" | "consumable_issue";
  requesterName: string;
  department: string;
  status: string;
  itemsCount: number;
  itemsSummary: string;
  purpose: string;
  requestedAt: string;
  approvedAt: string | null;
  fulfilledAt: string | null;
  turnaroundHours: number | null;
}

export interface RequestsSummary {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  fulfilledCount: number;
  rejectedCount: number;
  avgTurnaroundHours: number;
  departmentBreakdown: Array<{ department: string; count: number }>;
}

// ─── 7. Maintenance & Repairs Report ──────────────────────────────────────────

export interface MaintenanceReportRow {
  id: string;
  logCode: string;
  assetCode: string;
  assetName: string;
  category: string;
  condition: string;
  source: string;
  dateLogged: string;
  isResolved: boolean;
  resolutionDate: string | null;
  repairCost: number | null;
  mttrDays: number | null;
  loggedByName: string;
  resolvedByName: string | null;
  notes: string;
}

export interface MaintenanceSummary {
  totalWorkOrders: number;
  openWorkOrders: number;
  resolvedWorkOrders: number;
  totalRepairSpend: number;
  avgMttrDays: number;
  topFaultyAssets: Array<{ assetCode: string; name: string; count: number; totalCost: number }>;
  conditionBreakdown: Array<{ condition: string; count: number }>;
}

// ─── Shared Report Drilldown Types ──────────────────────────────────────────

export interface AssignedAssetItem {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  status: string;
  serialNumber?: string | null;
  value?: number | null;
  location?: string | null;
  assignedAt?: string | null;
  assignedByName?: string | null;
}

export interface ConsumedSupplyItem {
  id: string;
  itemCode: string;
  name: string;
  category?: string | null;
  quantity: number;
  unit: string;
  unitCost?: number | null;
  totalCost?: number | null;
  incurredOn?: string | null;
  purpose?: string | null;
}

// ─── 8. Project Report ────────────────────────────────────────────────────────

export interface ProjectReportRow {
  id: string;
  projectCode: string;
  projectName: string;
  department: string;
  status: "active" | "completed" | "on_hold" | "cancelled";
  startDate: string;
  endDate: string | null;
  assignedAssetsCount: number;
  consumablesConsumedCount: number;
  consumablesValue: number | null;
  totalProjectCost: number | null;
  managerName: string | null;
  description: string | null;
  assignedAssets?: AssignedAssetItem[];
  consumedSupplies?: ConsumedSupplyItem[];
}

export interface ProjectReportSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalAssetsAssigned: number;
  totalConsumablesConsumed: number;
  totalProjectSpend: number;
}

// ─── 9. Department Report ─────────────────────────────────────────────────────

export interface DepartmentReportRow {
  id: string;
  departmentName: string;
  assetsAssignedCount: number;
  assetsValue: number | null;
  consumablesConsumedCount: number;
  consumablesValue: number | null;
  activeMaintenanceCount: number;
  staffCount?: number | null;
  activeProjects: number;
  topAssets: string[];
  assignedAssets?: AssignedAssetItem[];
  consumedSupplies?: ConsumedSupplyItem[];
}

export interface DepartmentReportSummary {
  totalDepartments: number;
  totalAssetsDeployed: number;
  totalAssetsValue: number;
  totalConsumablesConsumed: number;
  totalConsumablesValue: number;
  mostActiveByAssets: string | null;
}
