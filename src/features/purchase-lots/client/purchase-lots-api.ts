import type {
  PurchaseLot,
  PurchaseOrderStatus,
  PoDeleteImpact,
} from "@/types/purchase-lots";
import type { ConsumableItem } from "@/features/consumables/client/consumables-api";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type LotReleaseResult = {
  consumable: ConsumableItem;
  lot: PurchaseLot;
  allocation: {
    lotId: string | null;
    lotCode: string | null;
    quantity: number;
    unitCost: string;
    total: string;
    supplierId?: string | null;
    supplierName?: string | null;
  };
};

export type CreatePurchaseOrderItemPayload = {
  itemType: "consumable" | "asset";
  consumableId?: string;
  assetId?: string;
  isNewItem?: boolean;
  name: string;
  category: string;
  /** Consumable-only: supply vs material when registering a new item. */
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
  projectId?: string;
  projectName?: string;
};

export type CreatePurchaseOrderPayload = {
  poNumber?: string;
  poDate: string;
  requestedBy: string;
  supplierId?: string;
  supplierName?: string;
  departmentId?: string;
  departmentName?: string;
  /** Project POs only — first id is primary. */
  departmentIds?: string[];
  projectId?: string;
  projectName?: string;
  purpose?: string;
  notes?: string;
  receiptUrl?: string | null;
  status?: PurchaseOrderStatus;
  items: CreatePurchaseOrderItemPayload[];
};

export type UpdatePurchaseOrderPayload = {
  poNumber?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  reference?: string | null;
  notes?: string | null;
  purpose?: string | null;
  receiptUrl?: string | null;
  purchasedOn?: string;
  recordedByName?: string | null;
  itemName?: string;
  quantity?: number;
  unitCost?: string | number;
};

export type UpdatePOStatusPayload = {
  status: PurchaseOrderStatus;
  notes?: string;
  receiptUrl?: string | null;
  approvedBy?: string;
  receivedQuantity?: number;
  cancellationReason?: string;
};

export type AddPurchaseOrderLinesPayload = {
  items: CreatePurchaseOrderItemPayload[];
};

export const purchaseLotsApi = {
  async list(params?: {
    consumableId?: string;
    assetId?: string;
    supplierId?: string;
    itemType?: "consumable" | "asset";
    status?: PurchaseOrderStatus;
    search?: string;
  }): Promise<PurchaseLot[]> {
    const sp = new URLSearchParams();
    if (params?.consumableId) sp.set("consumableId", params.consumableId);
    if (params?.assetId) sp.set("assetId", params.assetId);
    if (params?.supplierId) sp.set("supplierId", params.supplierId);
    if (params?.itemType) sp.set("itemType", params.itemType);
    if (params?.status) sp.set("status", params.status);
    if (params?.search) sp.set("search", params.search);
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<PurchaseLot[]>>(
      qs ? `/api/purchase-lots?${qs}` : "/api/purchase-lots"
    );
    return res.data;
  },

  async getById(id: string): Promise<PurchaseLot> {
    const res = await fetchJson<ApiResponse<PurchaseLot>>(
      `/api/purchase-lots/${id}`
    );
    return res.data;
  },

  async getByCode(code: string): Promise<PurchaseLot> {
    const res = await fetchJson<ApiResponse<PurchaseLot>>(
      `/api/purchase-lots/by-code?code=${encodeURIComponent(code)}`
    );
    return res.data;
  },

  async create(payload: CreatePurchaseOrderPayload): Promise<PurchaseLot[]> {
    const res = await fetchJson<ApiResponse<PurchaseLot[]>>(
      "/api/purchase-lots",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async update(id: string, payload: UpdatePurchaseOrderPayload): Promise<PurchaseLot> {
    const res = await fetchJson<ApiResponse<PurchaseLot>>(
      `/api/purchase-lots/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async updateStatus(id: string, payload: UpdatePOStatusPayload): Promise<PurchaseLot> {
    const res = await fetchJson<ApiResponse<PurchaseLot>>(
      `/api/purchase-lots/${id}/status`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async addLines(
    id: string,
    payload: AddPurchaseOrderLinesPayload
  ): Promise<PurchaseLot[]> {
    const res = await fetchJson<ApiResponse<PurchaseLot[]>>(
      `/api/purchase-lots/${id}/lines`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const res = await fetchJson<ApiResponse<{ success: boolean }>>(
      `/api/purchase-lots/${id}`,
      {
        method: "DELETE",
      }
    );
    return res.data;
  },

  /** TEMPORARY: preview force-delete impact for a whole PO. */
  async getDeleteImpact(poNumber: string): Promise<PoDeleteImpact> {
    const res = await fetchJson<ApiResponse<PoDeleteImpact>>(
      `/api/purchase-lots/delete-impact?poNumber=${encodeURIComponent(poNumber)}`
    );
    return res.data;
  },

  /** TEMPORARY: atomic delete-by-PO with inventory revert. */
  async deleteByPoNumber(
    poNumber: string
  ): Promise<{ success: boolean; impact: PoDeleteImpact }> {
    const res = await fetchJson<
      ApiResponse<{ success: boolean; impact: PoDeleteImpact }>
    >(
      `/api/purchase-lots/by-po?poNumber=${encodeURIComponent(poNumber)}`,
      { method: "DELETE" }
    );
    return res.data;
  },

  async scanRelease(payload: {
    code: string;
    quantity: number;
    reason?: string;
    notes?: string;
    recipientName?: string;
    departmentId?: string;
    projectId?: string;
  }): Promise<LotReleaseResult> {
    const res = await fetchJson<ApiResponse<LotReleaseResult>>(
      "/api/purchase-lots/scan/release",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async uploadReceipt(
    file: File,
    options?: { poNumber?: string; lotId?: string }
  ): Promise<{
    success: boolean;
    url: string;
    path: string;
    size: number;
    mimeType: string;
    originalName: string;
    lot?: PurchaseLot | null;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.poNumber) formData.append("poNumber", options.poNumber);
    if (options?.lotId) formData.append("lotId", options.lotId);

    const res = await fetch("/api/purchase-lots/receipt/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(
        errJson?.error || errJson?.message || "Failed to upload receipt image."
      );
    }
    const json = await res.json();
    return json.data || json;
  },
};
