import type { PettyCashVoucher, PettyCashStatus } from "@/types/petty-cash";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type CreatePettyCashPayload = {
  pcvNumber?: string;
  status?: PettyCashStatus;
  voucherDate: string;
  payeeName: string;
  amount: string | number;
  category?: string;
  particulars?: string;
  receiptNumber?: string | null;
  purchaseOrderNumber?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  isLegacy?: boolean;
};

export type UpdatePettyCashPayload = Partial<CreatePettyCashPayload>;

export type UpdatePettyCashStatusPayload = {
  status: PettyCashStatus;
};

export interface PettyCashListResponse {
  vouchers: PettyCashVoucher[];
  total: number;
}

export const pettyCashApi = {
  async getNextCode(): Promise<{ pcvNumber: string }> {
    const res = await fetchJson<ApiResponse<{ pcvNumber: string }>>(
      "/api/petty-cash/next-code"
    );
    return res.data;
  },

  async list(params?: {
    search?: string;
    status?: PettyCashStatus;
    category?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<PettyCashListResponse> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category) sp.set("category", params.category);
    if (params?.departmentId) sp.set("departmentId", params.departmentId);
    if (params?.startDate) sp.set("startDate", params.startDate);
    if (params?.endDate) sp.set("endDate", params.endDate);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<PettyCashListResponse>>(
      qs ? `/api/petty-cash?${qs}` : "/api/petty-cash"
    );
    return res.data;
  },

  async get(id: string): Promise<PettyCashVoucher> {
    const res = await fetchJson<ApiResponse<PettyCashVoucher>>(`/api/petty-cash/${id}`);
    return res.data;
  },

  async create(payload: CreatePettyCashPayload): Promise<PettyCashVoucher> {
    const res = await fetchJson<ApiResponse<PettyCashVoucher>>("/api/petty-cash", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async update(id: string, payload: UpdatePettyCashPayload): Promise<PettyCashVoucher> {
    const res = await fetchJson<ApiResponse<PettyCashVoucher>>(`/api/petty-cash/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateStatus(
    id: string,
    payload: UpdatePettyCashStatusPayload
  ): Promise<PettyCashVoucher> {
    const res = await fetchJson<ApiResponse<PettyCashVoucher>>(`/api/petty-cash/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const res = await fetchJson<ApiResponse<{ success: boolean }>>(
      `/api/petty-cash/${id}`,
      {
        method: "DELETE",
      }
    );
    return res.data;
  },
};
