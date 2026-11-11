export type DashboardSummary = {
  activeBorrows: number;
  activeAssignments: number;
  pendingApprovals?: number;
  /** Borrower sidebar: pending assignable asset requests. */
  pendingAssignRequests?: number;
  /** Borrower sidebar: pending borrowable asset requests. */
  pendingBorrowRequests?: number;
  /** Borrower sidebar: pending supply requisitions. */
  pendingSupplyRequests?: number;
  /** Borrower sidebar: pending material requisitions. */
  pendingMaterialRequests?: number;
  /** Borrower sidebar: pending mixed (supply + material) requisitions. */
  pendingMixedRequests?: number;
  overdueAssets: number;
  lowStockItems: number;
  totalRequests?: number;
  totalAssignable?: number;
  totalBorrowable?: number;
};
