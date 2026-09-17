import type { BaseFilterState } from "./filters";

export type ProjectStatus =
  | "draft"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectExpenseLineType =
  | "miscellaneous"
  | "adjustment"
  | "consumable"
  | "material"
  | "asset_writeoff";

export type ProjectExpenseCategory =
  | "travel"
  | "snacks"
  | "labor"
  | "broken_asset"
  | "fees"
  | "adjustment"
  | "miscellaneous"
  | "other";

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  location: string | null;
  department: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: string | null;
  notes: string | null;
  totalSpent: string;
  budgetRemaining: string | null;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isMutable: boolean;
}

export interface ProjectExpenseLine {
  id: string;
  projectId: string;
  lineType: ProjectExpenseLineType;
  category: ProjectExpenseCategory;
  /** Custom label when category is `other`. */
  categoryLabel?: string | null;
  description: string;
  amount: string;
  quantity: string | null;
  unitCost: string | null;
  consumableId: string | null;
  assetId: string | null;
  incurredOn: string;
  notes: string | null;
  recordedByUserId: string;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
  consumableCode?: string | null;
  consumableName?: string | null;
  consumableUnit?: string | null;
}

export type ProjectAssetAssignmentStatus =
  | "assigned"
  | "returned"
  | "written_off";

export interface ProjectAssetAssignment {
  id: string;
  projectId: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  status: ProjectAssetAssignmentStatus;
  assignedAt: string;
  returnedAt: string | null;
  assignedByName: string;
  returnedByName: string | null;
  notes: string | null;
  returnNotes: string | null;
}

export interface ProjectFilterState extends BaseFilterState {
  status: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PROJECT_EXPENSE_CATEGORY_LABELS: Record<
  ProjectExpenseCategory,
  string
> = {
  travel: "Travel",
  snacks: "Snacks / Meals",
  labor: "Labor",
  broken_asset: "Broken asset",
  fees: "Fees",
  adjustment: "Adjustment",
  miscellaneous: "Miscellaneous",
  other: "Other",
};

export const PROJECT_EXPENSE_LINE_TYPE_LABELS: Record<
  "miscellaneous" | "adjustment" | "material",
  string
> = {
  miscellaneous: "Expense",
  adjustment: "Adjustment / credit",
  material: "Manual material",
};

export interface ProjectProgressIndicator {
  id: string;
  projectId: string;
  tenantId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  completedDate: string | null;
  isCompleted: boolean;
  orderIndex: number;
  completedByUserId: string | null;
  completedByName: string | null;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProgressSummary {
  totalIndicators: number;
  completedIndicators: number;
  pendingIndicators: number;
  progressPercentage: number;
  indicators: ProjectProgressIndicator[];
}

/** Display label for expense category (uses custom text for Other). */
export function expenseCategoryDisplay(
  category: ProjectExpenseCategory,
  categoryLabel?: string | null
): string {
  if (category === "other" && categoryLabel?.trim()) {
    return categoryLabel.trim();
  }
  return PROJECT_EXPENSE_CATEGORY_LABELS[category];
}

