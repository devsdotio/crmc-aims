"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { PurchaseLot, PurchaseOrderStatus, PoDeleteImpact } from "@/types/purchase-lots";
import {
  STOCK_DOMAINS,
  invalidateDomains,
} from "@/features/shared/cache-invalidation";
import {
  purchaseLotsApi,
  type LotReleaseResult,
  type CreatePurchaseOrderPayload,
  type UpdatePurchaseOrderPayload,
  type UpdatePOStatusPayload,
} from "./purchase-lots-api";
import { purchaseLotQueryKeys } from "./query-keys";

const PO_DOMAINS = [
  ...STOCK_DOMAINS,
  "assets",
  "auditLogs",
  "dashboard",
  "projects",
] as const;

export function usePurchaseLotsQuery(params?: {
  consumableId?: string;
  assetId?: string;
  supplierId?: string;
  itemType?: "consumable" | "asset";
  status?: PurchaseOrderStatus;
  search?: string;
  enabled?: boolean;
}): UseQueryResult<PurchaseLot[], Error> {
  const { enabled = true, ...filters } = params ?? {};
  return useQuery({
    queryKey: purchaseLotQueryKeys.list(filters),
    queryFn: () => purchaseLotsApi.list(filters),
    enabled,
  });
}

export function usePurchaseLotQuery(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<PurchaseLot, Error> {
  return useQuery({
    queryKey: purchaseLotQueryKeys.detail(id),
    queryFn: () => purchaseLotsApi.getById(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useCreatePurchaseOrderMutation(): UseMutationResult<
  PurchaseLot[],
  Error,
  CreatePurchaseOrderPayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => purchaseLotsApi.create(payload),
    onMutate: async (newPO) => {
      // 1. Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: purchaseLotQueryKeys.all });

      // 2. Snapshot previous queries for rollback
      const previousQueries = qc.getQueriesData<PurchaseLot[]>({
        queryKey: purchaseLotQueryKeys.all,
      });

      // 3. Construct optimistic PurchaseLot items
      const optimisticBatchId = `optimistic-${Date.now()}`;
      const poNum =
        newPO.poNumber?.trim() ||
        `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const optimisticLots: PurchaseLot[] = newPO.items.map((item, idx) => {
        const qty = Number(item.quantity) || 1;
        const uCost =
          typeof item.unitCost === "number"
            ? item.unitCost
            : parseFloat(String(item.unitCost)) || 0;
        const total = qty * uCost;

        return {
          id: `${optimisticBatchId}-${idx}`,
          poNumber: poNum,
          lotCode: `${poNum}-LOT-${idx + 1}`,
          status: newPO.status || "pending_approval",
          itemType: item.itemType || "consumable",
          consumableId: item.consumableId || null,
          assetId: item.assetId || null,
          itemCode: (item.itemType === "asset" ? "AST" : "CON") + "-PENDING",
          itemName: item.name,
          supplierId: item.supplierId || newPO.supplierId || null,
          supplierName:
            item.suggestedDealer ||
            (newPO.supplierName &&
            newPO.supplierName.trim().toLowerCase() !== "multiple suppliers"
              ? newPO.supplierName
              : null) ||
            null,
          quantity: qty,
          quantityRemaining: qty,
          unitCost: uCost.toFixed(2),
          totalCost: total.toFixed(2),
          purchasedOn: newPO.poDate || new Date().toISOString(),
          reference: null,
          purpose: item.purpose || newPO.purpose || null,
          departmentId: newPO.departmentId || null,
          departmentName: newPO.departmentName || null,
          departments:
            newPO.departmentIds && newPO.departmentIds.length > 0
              ? newPO.departmentIds.map((id) => ({
                  id,
                  name:
                    id === newPO.departmentId
                      ? newPO.departmentName || ""
                      : "",
                }))
              : newPO.departmentId && newPO.departmentName
                ? [{ id: newPO.departmentId, name: newPO.departmentName }]
                : undefined,
          notes: newPO.notes || null,
          projectId: item.projectId || newPO.projectId || null,
          projectName: item.projectName || newPO.projectName || null,
          recordedByUserId: "current-user",
          recordedByName: newPO.requestedBy || "Current User",
          approvedByName: null,
          approvedAt: null,
          orderedAt: null,
          deliveredAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: newPO.items.map((it, i) => {
            const iQty = Number(it.quantity) || 1;
            const iCost =
              typeof it.unitCost === "number"
                ? it.unitCost
                : parseFloat(String(it.unitCost)) || 0;
            return {
              id: `${optimisticBatchId}-item-${i}`,
              itemType: it.itemType || "consumable",
              consumableId: it.consumableId || null,
              assetId: it.assetId || null,
              itemCode: (it.itemType === "asset" ? "AST" : "CON") + "-PENDING",
              itemName: it.name,
              quantity: iQty,
              unitCost: iCost.toFixed(2),
              totalCost: (iQty * iCost).toFixed(2),
              purpose: it.purpose || newPO.purpose || null,
              suggestedDealer:
                it.suggestedDealer ||
                (newPO.supplierName &&
                newPO.supplierName.trim().toLowerCase() !== "multiple suppliers"
                  ? newPO.supplierName
                  : null),
            };
          }),
        };
      });

      // 4. Optimistically update all matching cache lists
      qc.setQueriesData<PurchaseLot[]>(
        { queryKey: purchaseLotQueryKeys.all },
        (old) => {
          if (!old || !Array.isArray(old)) return old;
          return [...optimisticLots, ...old];
        }
      );

      return { previousQueries };
    },
    onError: (_err, _newPO, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          qc.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      void invalidateDomains(qc, PO_DOMAINS);
    },
  });
}

export function useUpdatePurchaseOrderMutation(): UseMutationResult<
  PurchaseLot,
  Error,
  { id: string; payload: UpdatePurchaseOrderPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => purchaseLotsApi.update(id, payload),
    onSettled: (_data, _err, { id }) => {
      void invalidateDomains(qc, PO_DOMAINS);
      qc.invalidateQueries({ queryKey: purchaseLotQueryKeys.detail(id) });
    },
  });
}

export function useUpdatePOStatusMutation(): UseMutationResult<
  PurchaseLot,
  Error,
  { id: string; payload: UpdatePOStatusPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => purchaseLotsApi.updateStatus(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: purchaseLotQueryKeys.all });
      const previousQueries = qc.getQueriesData<PurchaseLot[]>({
        queryKey: purchaseLotQueryKeys.all,
      });

      qc.setQueriesData<PurchaseLot[]>(
        { queryKey: purchaseLotQueryKeys.all },
        (old) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((lot) =>
            lot.id === id ? { ...lot, status: payload.status } : lot
          );
        }
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          qc.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: (_data, _err, { id }) => {
      void invalidateDomains(qc, PO_DOMAINS);
      qc.invalidateQueries({ queryKey: purchaseLotQueryKeys.detail(id) });
    },
  });
}

export function useDeletePurchaseOrderMutation(): UseMutationResult<
  { success: boolean },
  Error,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseLotsApi.delete(id),
    onSettled: () => {
      void invalidateDomains(qc, PO_DOMAINS);
    },
  });
}

/** TEMPORARY: delete entire PO with inventory revert. */
export function useDeletePurchaseOrderByPoMutation(): UseMutationResult<
  { success: boolean; impact: PoDeleteImpact },
  Error,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poNumber: string) => purchaseLotsApi.deleteByPoNumber(poNumber),
    onSettled: () => {
      void invalidateDomains(qc, PO_DOMAINS);
    },
  });
}

export function useUploadPOReceiptMutation(): UseMutationResult<
  {
    success: boolean;
    url: string;
    path: string;
    size: number;
    mimeType: string;
    originalName: string;
    lot?: PurchaseLot | null;
  },
  Error,
  { file: File; poNumber?: string; lotId?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, poNumber, lotId }) =>
      purchaseLotsApi.uploadReceipt(file, { poNumber, lotId }),
    onSettled: (_data, _err, vars) => {
      void invalidateDomains(qc, PO_DOMAINS);
      if (vars.lotId) {
        qc.invalidateQueries({
          queryKey: purchaseLotQueryKeys.detail(vars.lotId),
        });
      }
    },
  });
}

export function useReleaseFromLotMutation(): UseMutationResult<
  LotReleaseResult,
  Error,
  {
    code: string;
    quantity: number;
    reason?: string;
    notes?: string;
    recipientName?: string;
    departmentId?: string;
    projectId?: string;
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => purchaseLotsApi.scanRelease(payload),
    onSettled: () => {
      void invalidateDomains(qc, STOCK_DOMAINS);
    },
  });
}
