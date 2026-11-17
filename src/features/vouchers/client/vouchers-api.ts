import type { Voucher, VoucherType, VoucherStatus } from "@/types/vouchers";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type CreateVoucherPayload = {
  voucherCode?: string;
  type?: VoucherType;
  status?: VoucherStatus;
  voucherDate: string;
  payeeName: string;
  amount: string | number;
  supplierId?: string | null;
  supplierName?: string | null;
  purchaseOrderNumber?: string | null;
  assetId?: string | null;
  assetCode?: string | null;
  assetName?: string | null;
  purpose?: string;
  particulars?: string;
  checkNumber?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentIds?: string[];
  isLegacy?: boolean;
};

export type UpdateVoucherPayload = Partial<CreateVoucherPayload> & {
  approvedByName?: string | null;
};

export type UpdateVoucherStatusPayload = {
  status: VoucherStatus;
  notes?: string;
};

export interface VoucherStats {
  total: number;
  pendingCount: number;
  approvedCount: number;
  awaitingReceiptCount: number;
  completedCount: number;
  totalDisbursed: number;
}

export interface VoucherListResponse {
  vouchers: Voucher[];
  total: number;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    stats: VoucherStats;
  };
  stats?: VoucherStats;
}

export const vouchersApi = {
  async getNextCode(
    type: VoucherType = "disbursement",
    year?: number
  ): Promise<{ voucherCode: string }> {
    const sp = new URLSearchParams({ type });
    if (year != null) sp.set("year", String(year));
    const res = await fetchJson<ApiResponse<{ voucherCode: string }>>(
      `/api/vouchers/next-code?${sp}`
    );
    return res.data;
  },

  async list(params?: {
    search?: string;
    type?: VoucherType;
    status?: VoucherStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
    offset?: number;
  }): Promise<VoucherListResponse> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.type) sp.set("type", params.type);
    if (params?.status) sp.set("status", params.status);
    if (params?.startDate) sp.set("startDate", params.startDate);
    if (params?.endDate) sp.set("endDate", params.endDate);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<VoucherListResponse>>(
      qs ? `/api/vouchers?${qs}` : "/api/vouchers"
    );
    return res.data;
  },

  async get(id: string): Promise<Voucher> {
    const res = await fetchJson<ApiResponse<Voucher>>(`/api/vouchers/${id}`);
    return res.data;
  },

  async create(payload: CreateVoucherPayload): Promise<Voucher> {
    const res = await fetchJson<ApiResponse<Voucher>>("/api/vouchers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async update(id: string, payload: UpdateVoucherPayload): Promise<Voucher> {
    const res = await fetchJson<ApiResponse<Voucher>>(`/api/vouchers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateStatus(
    id: string,
    payload: UpdateVoucherStatusPayload
  ): Promise<Voucher> {
    const res = await fetchJson<ApiResponse<Voucher>>(`/api/vouchers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const res = await fetchJson<ApiResponse<{ success: boolean }>>(
      `/api/vouchers/${id}`,
      {
        method: "DELETE",
      }
    );
    return res.data;
  },
};
