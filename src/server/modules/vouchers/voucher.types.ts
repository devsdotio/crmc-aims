import type { VoucherRow, NewVoucherRow } from "@/server/db/schema";

export type VoucherType = "disbursement" | "property_transfer" | "liquidation";

export type VoucherStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "completed"
  | "cancelled";

export type VoucherDTO = {
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
};

export type ListVoucherFilters = {
  search?: string;
  type?: VoucherType;
  status?: VoucherStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export interface IVoucherRepository {
  findById(id: string): Promise<VoucherRow | null>;
  findByCode(code: string): Promise<VoucherRow | null>;
  list(filters?: ListVoucherFilters): Promise<{ vouchers: VoucherRow[]; total: number }>;
  create(data: Omit<NewVoucherRow, "id" | "createdAt" | "updatedAt">): Promise<VoucherRow>;
  update(
    id: string,
    data: Partial<Omit<VoucherRow, "id" | "createdAt">>
  ): Promise<VoucherRow | null>;
  findLatestVoucherCode(prefix: string): Promise<string | null>;
  delete(id: string): Promise<boolean>;
}
