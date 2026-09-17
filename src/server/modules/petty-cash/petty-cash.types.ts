import type { PettyCashRow, NewPettyCashRow } from "@/server/db/schema";
import type { PettyCashStatus } from "@/types/petty-cash";

export type PettyCashDTO = {
  id: string;
  pcvNumber: string;
  status: PettyCashStatus;
  voucherDate: string;
  payeeName: string;
  amount: string;
  category: string;
  purpose: string;
  particulars: string;
  receiptNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  purchaseOrderNumber: string | null;
  departmentId: string | null;
  departmentName: string | null;
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

export type ListPettyCashFilters = {
  search?: string;
  status?: PettyCashStatus;
  category?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export interface IPettyCashRepository {
  findById(id: string): Promise<PettyCashRow | null>;
  findByCode(code: string): Promise<PettyCashRow | null>;
  list(filters?: ListPettyCashFilters): Promise<{ vouchers: PettyCashRow[]; total: number }>;
  create(data: Omit<NewPettyCashRow, "id" | "createdAt" | "updatedAt">): Promise<PettyCashRow>;
  update(
    id: string,
    data: Partial<Omit<PettyCashRow, "id" | "createdAt">>
  ): Promise<PettyCashRow | null>;
  delete(id: string): Promise<boolean>;
  findLatestPcvCode(prefix: string): Promise<string | null>;
}
