import type { ConsumableDTO } from "@/server/modules/consumables/consumable.types";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type ConsumableItem = ConsumableDTO;

export type CreateConsumablePayload = {
  itemCode?: string;
  name: string;
  category: ConsumableItem["category"];
  classification?: ConsumableItem["classification"];
  categoryClass?: string;
  unit: string;
  currentQty?: number;
  minThreshold?: number;
  location: string;
  supplier?: string;
  supplierId?: string | null;
  /** Required when currentQty > 0. */
  unitCost?: string | number;
  notes?: string;
  isSandbox?: boolean;
};

export type UpdateConsumablePayload = {
  name?: string;
  category?: ConsumableItem["category"];
  classification?: ConsumableItem["classification"];
  categoryClass?: string;
  unit?: string;
  minThreshold?: number;
  location?: string;
  supplier?: string | null;
  notes?: string | null;
  isSandbox?: boolean;
};

export type StockMovementPayload = {
  quantity: number;
  reason?: string;
  notes?: string;
};

export type RestockPayload = {
  quantity: number;
  unitCost: string | number;
  supplierId?: string | null;
  reason?: string;
  notes?: string;
  purchasedOn?: string;
};

export type StockAdjustPayload = {
  quantityChange: number;
  reason: string;
  notes?: string;
  useFifo?: boolean;
  allocations?: Array<{
    lotId?: string;
    lotCode?: string;
    quantity: number;
  }>;
  attachLotId?: string;
  attachLotCode?: string;
  createCorrectionLot?: boolean;
  unitCost?: string | number;
  supplierId?: string | null;
};

export const consumablesApi = {
  async list(params?: {
    category?: ConsumableItem["category"];
    classification?: ConsumableItem["classification"];
    stockLevel?: "all" | "healthy" | "low" | "critical";
    search?: string;
    page?: number;
    limit?: number;
    /** Request-wizard path for borrowers (warehouse catalog). */
    catalog?: boolean;
  }): Promise<import("@/types/filters").PaginatedResponse<ConsumableItem>> {
    const sp = new URLSearchParams();
    if (params?.category) sp.set("category", params.category);
    if (params?.classification) sp.set("classification", params.classification);
    if (params?.stockLevel) sp.set("stockLevel", params.stockLevel);
    if (params?.search) sp.set("search", params.search);
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    if (params?.catalog) sp.set("catalog", "1");
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<import("@/types/filters").PaginatedResponse<ConsumableItem>>>(
      qs ? `/api/consumables?${qs}` : "/api/consumables"
    );
    return res.data;
  },

  /**
   * Walk every page. Request pickers used to stop at the first 100 rows
   * (lowest on-hand first), so later supplies never appeared for requesters.
   */
  async listAll(params?: {
    category?: ConsumableItem["category"];
    classification?: ConsumableItem["classification"];
    stockLevel?: "all" | "healthy" | "low" | "critical";
    search?: string;
    catalog?: boolean;
  }): Promise<ConsumableItem[]> {
    const limit = 200;
    const first = await this.list({ ...params, page: 1, limit });
    const totalPages = Math.min(Math.max(first.totalPages || 1, 1), 25);
    if (totalPages <= 1) return first.data;

    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        this.list({ ...params, page: index + 2, limit })
      )
    );

    const seen = new Set<string>();
    const data: ConsumableItem[] = [];
    for (const row of [first, ...rest].flatMap((page) => page.data)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      data.push(row);
    }
    return data;
  },

  async getById(id: string): Promise<ConsumableItem> {
    const res = await fetchJson<ApiResponse<ConsumableItem>>(
      `/api/consumables/${id}`
    );
    return res.data;
  },

  async create(payload: CreateConsumablePayload): Promise<ConsumableItem> {
    const res = await fetchJson<ApiResponse<ConsumableItem>>("/api/consumables", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async update(
    id: string,
    payload: UpdateConsumablePayload
  ): Promise<ConsumableItem> {
    const res = await fetchJson<ApiResponse<ConsumableItem>>(
      `/api/consumables/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async restock(
    id: string,
    payload: RestockPayload
  ): Promise<ConsumableItem> {
    const res = await fetchJson<ApiResponse<ConsumableItem>>(
      `/api/consumables/${id}/restock`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async adjust(
    id: string,
    payload: StockAdjustPayload
  ): Promise<ConsumableItem> {
    const res = await fetchJson<ApiResponse<ConsumableItem>>(
      `/api/consumables/${id}/adjust`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const res = await fetchJson<ApiResponse<{ success: boolean }>>(
      `/api/consumables/${id}`,
      { method: "DELETE" }
    );
    return res.data;
  },
};
