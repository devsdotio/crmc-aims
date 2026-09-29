"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  STOCK_DOMAINS,
  invalidateDomains,
} from "@/features/shared/cache-invalidation";
import type { PaginatedResponse } from "@/types/filters";
import type { StockHistoryEntry } from "@/types/inventory";

import {
  consumablesApi,
  type CreateConsumablePayload,
  type ConsumableItem,
  type RestockPayload,
  type StockAdjustPayload,
  type UpdateConsumablePayload,
} from "./consumables-api";
import { consumableQueryKeys } from "./query-keys";

export type { StockAdjustPayload };

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void invalidateDomains(qc, STOCK_DOMAINS);
  if (id) {
    qc.invalidateQueries({ queryKey: consumableQueryKeys.detail(id) });
  }
}

export function useConsumablesQuery(filters?: {
  category?: ConsumableItem["category"];
  classification?: ConsumableItem["classification"];
  stockLevel?: "all" | "healthy" | "low" | "critical";
  search?: string;
  page?: number;
  limit?: number;
  catalog?: boolean;
  enabled?: boolean;
}): UseQueryResult<
  PaginatedResponse<ConsumableItem>,
  Error
> {
  const { enabled = true, ...listFilters } = filters ?? {};
  return useQuery({
    // Stock levels move with every issue and restock, so this rides the global
    // 30s stale window instead of holding a five-minute snapshot.
    queryKey: consumableQueryKeys.list(listFilters),
    queryFn: () => consumablesApi.list(listFilters),
    enabled,
  });
}

export function useConsumableQuery(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<ConsumableItem, Error> {
  return useQuery({
    queryKey: consumableQueryKeys.detail(id),
    queryFn: () => consumablesApi.getById(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useCreateConsumableMutation(): UseMutationResult<
  ConsumableItem,
  Error,
  CreateConsumablePayload
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => consumablesApi.create(payload),
    onMutate: async (newConsumable) => {
      await qc.cancelQueries({ queryKey: consumableQueryKeys.all });

      const previousLists = qc.getQueriesData<PaginatedResponse<ConsumableItem>>({
        queryKey: consumableQueryKeys.lists(),
      });

      const initialQty = newConsumable.currentQty ?? 0;
      const optimisticItem: ConsumableItem = {
        id: `temp-${Date.now()}`,
        itemCode: newConsumable.itemCode || `TEMP-${Date.now()}`,
        name: newConsumable.name,
        category: newConsumable.category,
        classification: newConsumable.classification ?? "supply",
        unit: newConsumable.unit || "pcs",
        currentQty: initialQty,
        reservedQty: 0,
        availableQty: initialQty,
        minThreshold: newConsumable.minThreshold ?? 10,
        location: newConsumable.location || "",
        supplier: newConsumable.supplier ?? undefined,
        lastRestocked: new Date().toISOString(),
        notes: newConsumable.notes ?? undefined,
        history: [],
      };

      qc.setQueriesData<PaginatedResponse<ConsumableItem>>(
        { queryKey: consumableQueryKeys.lists() },
        (old) => {
          if (!old) {
            return {
              data: [optimisticItem],
              total: 1,
              page: 1,
              limit: 50,
              totalPages: 1,
            };
          }
          return {
            ...old,
            data: [...old.data, optimisticItem],
            total: old.total + 1,
          };
        }
      );

      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      invalidate(qc);
    },
  });
}

export function useUpdateConsumableMutation(): UseMutationResult<
  ConsumableItem,
  Error,
  { id: string; payload: UpdateConsumablePayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => consumablesApi.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: consumableQueryKeys.all });

      const previousLists = qc.getQueriesData<PaginatedResponse<ConsumableItem>>({
        queryKey: consumableQueryKeys.lists(),
      });
      const previousDetail = qc.getQueryData<ConsumableItem>(
        consumableQueryKeys.detail(id)
      );

      const sanitizedUpdates: Partial<ConsumableItem> = {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.category !== undefined && { category: payload.category }),
        ...(payload.classification !== undefined && {
          classification: payload.classification,
        }),
        ...(payload.unit !== undefined && { unit: payload.unit }),
        ...(payload.minThreshold !== undefined && { minThreshold: payload.minThreshold }),
        ...(payload.location !== undefined && { location: payload.location }),
        ...(payload.supplier !== undefined && { supplier: payload.supplier ?? undefined }),
        ...(payload.notes !== undefined && { notes: payload.notes ?? undefined }),
      };

      // Optimistically update all matching lists
      qc.setQueriesData<PaginatedResponse<ConsumableItem>>(
        { queryKey: consumableQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) =>
              item.id === id ? { ...item, ...sanitizedUpdates } : item
            ),
          };
        }
      );

      // Optimistically update detail
      if (previousDetail) {
        qc.setQueryData<ConsumableItem>(consumableQueryKeys.detail(id), {
          ...previousDetail,
          ...sanitizedUpdates,
        });
      }

      return { previousLists, previousDetail };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        qc.setQueryData(consumableQueryKeys.detail(id), context.previousDetail);
      }
    },
    onSuccess: (updatedItem) => {
      qc.setQueryData(consumableQueryKeys.detail(updatedItem.id), updatedItem);
    },
    onSettled: (_data, _error, { id }) => {
      invalidate(qc, id);
    },
  });
}

export function useRestockConsumableMutation(): UseMutationResult<
  ConsumableItem,
  Error,
  { id: string; payload: RestockPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => consumablesApi.restock(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: consumableQueryKeys.all });

      const previousLists = qc.getQueriesData<PaginatedResponse<ConsumableItem>>({
        queryKey: consumableQueryKeys.lists(),
      });
      const previousDetail = qc.getQueryData<ConsumableItem>(
        consumableQueryKeys.detail(id)
      );

      const addedQty = Number(payload.quantity) || 0;
      const nowIso = new Date().toISOString();

      // Optimistically update lists
      qc.setQueriesData<PaginatedResponse<ConsumableItem>>(
        { queryKey: consumableQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) => {
              if (item.id !== id) return item;
              const newQty = item.currentQty + addedQty;
              const newAvailable = item.availableQty + addedQty;
              return {
                ...item,
                currentQty: newQty,
                availableQty: newAvailable,
                lastRestocked: nowIso,
              };
            }),
          };
        }
      );

      // Optimistically update detail
      if (previousDetail) {
        const optimisticHistory: StockHistoryEntry = {
          id: `temp-history-${Date.now()}`,
          date: nowIso,
          type: "restock",
          quantityChange: addedQty,
          actor: "Current User",
          unitCost: String(payload.unitCost),
          notes: payload.notes,
          supplierId: payload.supplierId ?? undefined,
        };

        const newQty = previousDetail.currentQty + addedQty;
        const newAvailable = previousDetail.availableQty + addedQty;

        qc.setQueryData<ConsumableItem>(consumableQueryKeys.detail(id), {
          ...previousDetail,
          currentQty: newQty,
          availableQty: newAvailable,
          lastRestocked: nowIso,
          history: [optimisticHistory, ...(previousDetail.history || [])],
        });
      }

      return { previousLists, previousDetail };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        qc.setQueryData(consumableQueryKeys.detail(id), context.previousDetail);
      }
    },
    onSuccess: (updatedItem) => {
      qc.setQueryData(consumableQueryKeys.detail(updatedItem.id), updatedItem);
    },
    onSettled: (_data, _error, { id }) => {
      invalidate(qc, id);
    },
  });
}

export function useAdjustConsumableMutation(): UseMutationResult<
  ConsumableItem,
  Error,
  { id: string; payload: StockAdjustPayload }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => consumablesApi.adjust(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: consumableQueryKeys.all });

      const previousLists = qc.getQueriesData<PaginatedResponse<ConsumableItem>>({
        queryKey: consumableQueryKeys.lists(),
      });
      const previousDetail = qc.getQueryData<ConsumableItem>(
        consumableQueryKeys.detail(id)
      );

      const change = Number(payload.quantityChange) || 0;
      const nowIso = new Date().toISOString();

      // Optimistically update lists
      qc.setQueriesData<PaginatedResponse<ConsumableItem>>(
        { queryKey: consumableQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) => {
              if (item.id !== id) return item;
              const newQty = Math.max(0, item.currentQty + change);
              const newAvailable = Math.max(0, item.availableQty + change);
              return {
                ...item,
                currentQty: newQty,
                availableQty: newAvailable,
              };
            }),
          };
        }
      );

      // Optimistically update detail
      if (previousDetail) {
        const optimisticHistory: StockHistoryEntry = {
          id: `temp-history-${Date.now()}`,
          date: nowIso,
          type: "adjustment",
          quantityChange: change,
          actor: "Current User",
          reason: payload.reason,
          notes: payload.notes,
        };

        const newQty = Math.max(0, previousDetail.currentQty + change);
        const newAvailable = Math.max(0, previousDetail.availableQty + change);

        qc.setQueryData<ConsumableItem>(consumableQueryKeys.detail(id), {
          ...previousDetail,
          currentQty: newQty,
          availableQty: newAvailable,
          history: [optimisticHistory, ...(previousDetail.history || [])],
        });
      }

      return { previousLists, previousDetail };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        qc.setQueryData(consumableQueryKeys.detail(id), context.previousDetail);
      }
    },
    onSuccess: (updatedItem) => {
      qc.setQueryData(consumableQueryKeys.detail(updatedItem.id), updatedItem);
    },
    onSettled: (_data, _error, { id }) => {
      invalidate(qc, id);
    },
  });
}

export function useDeleteConsumableMutation(): UseMutationResult<
  { success: boolean },
  Error,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => consumablesApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: consumableQueryKeys.all });
      const previousLists = qc.getQueriesData<PaginatedResponse<ConsumableItem>>({
        queryKey: consumableQueryKeys.lists(),
      });
      const previousDetail = qc.getQueryData<ConsumableItem>(
        consumableQueryKeys.detail(id)
      );

      // Optimistically remove from all cached lists
      qc.setQueriesData<PaginatedResponse<ConsumableItem>>(
        { queryKey: consumableQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            total: Math.max(0, old.total - 1),
            data: old.data.filter((item) => item.id !== id),
          };
        }
      );

      return { previousLists, previousDetail };
    },
    onError: (_err, id, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        qc.setQueryData(consumableQueryKeys.detail(id), context.previousDetail);
      }
    },
    onSettled: (_data, _error, id) => {
      invalidate(qc, id);
    },
  });
}
