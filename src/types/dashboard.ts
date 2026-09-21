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
  overdueAssets: number;
  lowStockItems: number;
  totalRequests?: number;
  totalAssignable?: number;
  totalBorrowable?: number;
};
