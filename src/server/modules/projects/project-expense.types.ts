import type { ProjectExpenseLineRow } from "@/server/db/schema";

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

export type ProjectExpenseLineDTO = {
  id: string;
  projectId: string;
  lineType: ProjectExpenseLineType;
  category: ProjectExpenseCategory;
  /** Present when category is `other`. */
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
};

export type ListExpenseFilters = {
  projectId: string;
  category?: ProjectExpenseCategory;
};

export interface IProjectExpenseRepository {
  findById(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<ProjectExpenseLineRow | null>;
  listByProject(
    projectId: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<ProjectExpenseLineRow[]>;
  sumAmountsByProjectIds(
    projectIds: string[],
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<Map<string, string>>;
  create(
    data: Omit<
      import("@/server/db/schema").NewProjectExpenseLineRow,
      "id" | "createdAt" | "updatedAt"
    >,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<ProjectExpenseLineRow>;
  update(
    id: string,
    data: Partial<
      Omit<ProjectExpenseLineRow, "id" | "createdAt" | "projectId">
    >,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<ProjectExpenseLineRow | null>;
  delete(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<boolean>;
}
