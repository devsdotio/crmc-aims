import type { PurchaseLotRow } from "@/server/db/schema";
import type { PurchaseOrderStatus, POLineItemDetail } from "@/types/purchase-lots";

export type { PurchaseOrderStatus, POLineItemDetail };
export type PurchaseLotItemType = "consumable" | "asset";

export type PurchaseLotDTO = {
  id: string;
  poNumber: string;
  lotCode: string;
  status: PurchaseOrderStatus;
  itemType: PurchaseLotItemType;
  consumableId: string | null;
  assetId: string | null;
  itemCode: string;
  itemName: string;
  supplierId: string | null;
  supplierName: string | null;
  quantity: number;
  quantityRemaining: number;
  /** Original ordered qty when receive differs (from notes metadata). */
  orderedQuantity?: number;
  /** Qty actually stocked on deliver (from notes metadata). */
  receivedQuantity?: number | null;
  unitCost: string;
  totalCost: string;
  purchasedOn: string;
  reference: string | null;
  purpose?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  notes: string | null;
  receiptUrl?: string | null;
  recordedByUserId: string;
  recordedByName: string;
  approvedByName?: string | null;
  approvedAt?: string | null;
  orderedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: POLineItemDetail[];
  /** Print/scan payload: `CRMC-AIMS-LOT:{lotCode}` */
  qrPayload: string;
};

export type ListPurchaseLotFilters = {
  consumableId?: string;
  assetId?: string;
  supplierId?: string;
  itemType?: PurchaseLotItemType;
  status?: PurchaseOrderStatus;
  search?: string;
  includeSandbox?: boolean;
};

export type CreatePurchaseLotInput = {
  itemType: PurchaseLotItemType;
  consumableId?: string | null;
  assetId?: string | null;
  itemCode: string;
  itemName: string;
  supplierId?: string | null;
  supplierName?: string | null;
  quantity: number;
  unitCost: string;
  purchasedOn: string;
  reference?: string | null;
  purpose?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  status?: PurchaseOrderStatus;
  recordedByUserId: string;
  recordedByName: string;
};

export type CreatePurchaseOrderItemInput = {
  itemType: PurchaseLotItemType;
  consumableId?: string;
  assetId?: string;
  isNewItem?: boolean;
  name: string;
  category: string;
  classification?: "supply" | "material";
  unit?: string;
  minThreshold?: number;
  location?: string;
  assignmentType?: "borrowable" | "assignable";
  model?: string;
  quantity: number;
  unitCost: string | number;
  purpose?: string;
  suggestedDealer?: string;
  supplierId?: string;
};

export type CreatePurchaseOrderInput = {
  poNumber?: string;
  poDate: string;
  requestedBy: string;
  supplierId?: string;
  supplierName?: string;
  departmentId?: string;
  departmentName?: string;
  purpose?: string;
  notes?: string;
  receiptUrl?: string | null;
  status?: PurchaseOrderStatus;
  items: CreatePurchaseOrderItemInput[];
};

export type UpdatePurchaseOrderInput = {
  poNumber?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  reference?: string | null;
  notes?: string | null;
  purpose?: string | null;
  receiptUrl?: string | null;
  purchasedOn?: string;
  recordedByName?: string | null;
};

export type UpdatePurchaseOrderStatusInput = {
  status: PurchaseOrderStatus;
  notes?: string;
  receiptUrl?: string | null;
  approvedBy?: string;
  receivedQuantity?: number;
};

export interface IPurchaseLotRepository {
  findById(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow | null>;
  list(
    filters?: ListPurchaseLotFilters,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<PurchaseLotRow[]>;
  create(
    data: Omit<
      import("@/server/db/schema").NewPurchaseLotRow,
      "id" | "createdAt" | "updatedAt"
    >,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<PurchaseLotRow>;
}
