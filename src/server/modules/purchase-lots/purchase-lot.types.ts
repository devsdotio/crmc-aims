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
  /** Sponsoring / requesting departments (primary = departmentId). */
  departments?: Array<{ id: string; name: string }>;
  projectId?: string | null;
  projectName?: string | null;
  notes: string | null;
  receiptUrl?: string | null;
  recordedByUserId: string;
  recordedByName: string;
  approvedByName?: string | null;
  approvedAt?: string | null;
  orderedAt?: string | null;
  deliveredAt?: string | null;
  /** Set when the PO (or line) is cancelled — shown on the cancelled record. */
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: POLineItemDetail[];
  /** Print/scan payload: `CRMC-AIMS-LOT:{lotCode}` */
  qrPayload: string;
  disbursement?: {
    kind: "voucher" | "petty_cash";
    id: string;
    code: string;
    status: string;
  } | null;
};

export type ListPurchaseLotFilters = {
  consumableId?: string;
  consumableIds?: string[];
  assetId?: string;
  supplierId?: string;
  itemType?: PurchaseLotItemType;
  status?: PurchaseOrderStatus;
  statuses?: PurchaseOrderStatus[];
  /** Max distinct PO numbers after status filter. */
  limit?: number;
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
  departmentId?: string | null;
  departmentName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  status?: PurchaseOrderStatus;
  recordedByUserId: string;
  recordedByName: string;
  /** Required for tenant-scoped lot lists; falls back to request tenant context. */
  tenantId?: string | null;
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
  purpose: string;
  suggestedDealer?: string;
  supplierId?: string;
  projectId?: string;
  projectName?: string;
};

export type CreatePurchaseOrderInput = {
  poNumber?: string;
  poDate: string;
  requestedBy: string;
  supplierId?: string;
  supplierName?: string;
  departmentId?: string;
  departmentName?: string;
  /** Project POs only — first id is primary (also written to departmentId). */
  departmentIds?: string[];
  projectId?: string | null;
  projectName?: string | null;
  purpose: string;
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
  /** Batch-update purpose on sibling lots (multi-purpose PO edit). */
  linePurposes?: Array<{ lotId: string; purpose: string }>;
  receiptUrl?: string | null;
  purchasedOn?: string;
  recordedByName?: string | null;
  itemName?: string;
  quantity?: number;
  unitCost?: string | number;
};

export type UpdatePurchaseOrderStatusInput = {
  status: PurchaseOrderStatus;
  notes?: string;
  receiptUrl?: string | null;
  approvedBy?: string;
  receivedQuantity?: number;
  cancellationReason?: string;
};

export type AddPurchaseOrderLinesInput = {
  items: CreatePurchaseOrderItemInput[];
};

/** TEMPORARY: PO force-delete with inventory revert */
export type PoDeleteAssetUnit = {
  id: string;
  assetCode: string;
  name: string;
  status: string;
  currentHolder: string | null;
  reservedForRequestId: string | null;
};

export type PoDeleteLineEffect = {
  lotId: string;
  lotCode: string;
  itemName: string;
  itemType: PurchaseLotItemType;
  status: PurchaseOrderStatus;
  projectId: string | null;
  projectName?: string | null;
  effects: string[];
  qtyToReverse?: number;
  assetsToDelete?: PoDeleteAssetUnit[];
  movementsToRemove?: number;
  expensesToRemove?: number;
};

export type PoDeleteBlocker = {
  lotId: string;
  itemName: string;
  code: string;
  message: string;
};

export type PoDeleteImpact = {
  poNumber: string;
  canDelete: boolean;
  lineCount: number;
  lines: PoDeleteLineEffect[];
  blockers: PoDeleteBlocker[];
  warnings: string[];
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
