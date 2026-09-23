export type PurchaseLotItemType = "consumable" | "asset";

export type PurchaseOrderStatus =
  | "pending_approval"
  | "approved"
  | "ordered"
  | "delivered"
  | "cancelled";

export interface POLineItemDetail {
  id: string;
  itemType: PurchaseLotItemType;
  consumableId?: string | null;
  assetId?: string | null;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: string;
  totalCost: string;
  purpose?: string | null;
  suggestedDealer?: string | null;
  lotCode?: string;
}

export interface PurchaseLot {
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
  orderedQuantity?: number;
  receivedQuantity?: number | null;
  unitCost: string;
  totalCost: string;
  purchasedOn: string;
  reference: string | null;
  purpose?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  /** Sponsoring departments for project POs (primary = departmentId). */
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
  createdAt: string;
  updatedAt: string;
  /** Line items if this record represents a multi-item PO batch */
  items?: POLineItemDetail[];
  /** Canonical QR payload for physical batch tags: `CRMC-AIMS-LOT:{lotCode}` */
  qrPayload?: string;
  /**
   * Active disbursement claim (non-cancelled voucher or petty cash).
   * When set, this PO cannot be linked again.
   */
  disbursement?: {
    kind: "voucher" | "petty_cash";
    id: string;
    code: string;
    status: string;
  } | null;
}

/** TEMPORARY: delete-PO impact preview */
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
