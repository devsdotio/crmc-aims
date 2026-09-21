import type { Supplier, SupplierStatus } from "@/types/suppliers";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type CreateSupplierPayload = {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: SupplierStatus;
};

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export const suppliersApi = {
  async list(params?: {
    search?: string;
    status?: SupplierStatus;
    activeOnly?: boolean;
  }): Promise<Supplier[]> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.activeOnly) sp.set("activeOnly", "true");
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<Supplier[]>>(
      qs ? `/api/suppliers?${qs}` : "/api/suppliers"
    );
    return res.data;
  },

  async get(id: string): Promise<Supplier> {
    const res = await fetchJson<ApiResponse<Supplier>>(`/api/suppliers/${id}`);
    return res.data;
  },

  async create(payload: CreateSupplierPayload): Promise<Supplier> {
    const res = await fetchJson<ApiResponse<Supplier>>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async update(id: string, payload: UpdateSupplierPayload): Promise<Supplier> {
    const res = await fetchJson<ApiResponse<Supplier>>(`/api/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async deactivate(id: string): Promise<Supplier> {
    const res = await fetchJson<ApiResponse<Supplier>>(`/api/suppliers/${id}`, {
      method: "DELETE",
    });
    return res.data;
  },
};
