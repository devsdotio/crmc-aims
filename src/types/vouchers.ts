export type VoucherType = "disbursement" | "property_transfer" | "liquidation";

export type VoucherStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "completed"
  | "cancelled";

export interface Voucher {
  id: string;
  voucherCode: string;
  type: VoucherType;
  status: VoucherStatus;
  voucherDate: string;
  payeeName: string;
  amount: string;
  supplierId: string | null;
  supplierName: string | null;
  purchaseOrderNumber: string | null;
  assetId: string | null;
  assetCode: string | null;
  assetName: string | null;
  particulars: string;
  checkNumber: string | null;
  isLegacy: boolean;
  createdByUserId: string;
  createdByName: string;
  approvedByUserId: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  completedByUserId: string | null;
  completedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
