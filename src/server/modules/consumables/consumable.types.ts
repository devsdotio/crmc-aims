import type { ConsumableRow, StockHistoryEntry } from "@/server/db/schema";
import type { PaginationParams, PaginatedResponse } from "@/types/filters";
import {
  DEFAULT_CONSUMABLE_CLASSIFICATION,
  isConsumableClassification,
  type ConsumableClassification,
} from "@/lib/consumable-classification";

export type ConsumableDTO = {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  classification: ConsumableClassification;
  unit: string;
  currentQty: number;
  reservedQty: number;
  availableQty: number;
  minThreshold: number;
  location: string;
  supplier?: string;
  lastRestocked: string;
  notes?: string;
  isSandbox?: boolean;
  history: StockHistoryEntry[];
};

export type ListConsumableFilters = PaginationParams & {
  category?: ConsumableDTO["category"];
  classification?: ConsumableClassification;
  stockLevel?: "all" | "healthy" | "low" | "critical";
  search?: string;
  includeSandbox?: boolean;
};

export interface IConsumableRepository {
  findById(id: string): Promise<ConsumableRow | null>;
  findByCode(itemCode: string): Promise<ConsumableRow | null>;
  list(filters?: ListConsumableFilters): Promise<PaginatedResponse<ConsumableRow>>;
  countYear(): Promise<number>;
  countLowStock(): Promise<number>;
  getLowStockItems(limit: number): Promise<ConsumableRow[]>;
  getCategoryDistribution(session?: import("@/server/db/transaction").DbSession): Promise<{ category: string; count: number }[]>;
  create(
    data: Omit<
      import("@/server/db/schema").NewConsumableRow,
      "id" | "createdAt" | "updatedAt"
    >
  ): Promise<ConsumableRow>;
  update(
    id: string,
    data: Partial<Omit<ConsumableRow, "id" | "createdAt" | "itemCode">>
  ): Promise<ConsumableRow | null>;
  delete(id: string, session?: import("@/server/db/transaction").DbSession): Promise<boolean>;
}
