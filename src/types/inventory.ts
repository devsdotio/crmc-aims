import type { BaseFilterState } from "./filters";
import type { ConsumableClassification } from "@/lib/consumable-classification";

export type StockSeverity = "healthy" | "low" | "critical";

export type ConsumableCategory = string;

export type { ConsumableClassification };

export type StockActionType = "restock" | "adjustment" | "checkout";

export interface StockHistoryEntry {
  id: string;
  date: string;
  type: StockActionType;
  quantityChange: number;
  actor: string;
  reason?: string;
  notes?: string;
  unitCost?: string;
  supplierId?: string;
  supplierName?: string;
  lotCode?: string;
  totalCost?: string;
  recipientName?: string;
  lotAllocations?: Array<{
    lotId: string | null;
    lotCode: string | null;
    quantity: number;
    unitCost: string;
    total: string;
    supplierId?: string | null;
    supplierName?: string | null;
    uncosted?: boolean;
  }>;
}

export interface ConsumableItem {
  id: string;
  itemCode: string;
  name: string;
  category: ConsumableCategory;
  /** Broad class: supply (Consumable Supplies) or material (Consumable Materials). */
  classification: ConsumableClassification;
  unit: string;
  currentQty: number;
  /** Qty promised to approved supply requests not yet issued. */
  reservedQty: number;
  /** currentQty minus reservedQty — what can still be requested or walk-up issued. */
  availableQty: number;
  minThreshold: number;
  location: string;
  /** Preferred supplier display name from registry (denormalized). */
  supplier?: string | null;
  lastRestocked: string;
  notes?: string;
  /** Testing-only catalog row; hidden unless superadmin opts in. */
  isSandbox?: boolean;
  history: StockHistoryEntry[];
}

export interface ConsumableFilterState extends BaseFilterState {
  category: string;
  classification: "all" | ConsumableClassification;
  stockLevel: "all" | "healthy" | "low" | "critical";
  sortBy: "qty" | "qty_desc" | "critical" | "name" | "updated";
}
