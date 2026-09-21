"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { auditLogsApi, type AuditLogRecord, type FlattenedLog } from "./audit-logs-api";
import { auditLogQueryKeys } from "./query-keys";

export function useAuditLogsQuery(filters?: {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  enabled?: boolean;
}): UseQueryResult<AuditLogRecord[], Error> {
  const { enabled = true, ...listFilters } = filters ?? {};
  return useQuery({
    queryKey: auditLogQueryKeys.list(listFilters),
    queryFn: () => auditLogsApi.list(listFilters),
    enabled,
  });
}

export function useBorrowRequestsHistoryQuery(): UseQueryResult<FlattenedLog[], Error> {
  return useQuery({
    queryKey: ["audit-logs", "borrow-requests-history"],
    queryFn: () => auditLogsApi.listBorrowRequests(),
  });
}

export function useRequisitionsHistoryQuery(): UseQueryResult<FlattenedLog[], Error> {
  return useQuery({
    queryKey: ["audit-logs", "requisitions-history"],
    queryFn: () => auditLogsApi.listRequisitions(),
  });
}

export function useConsumableRequestsAuditQuery() {
  return useQuery({
    queryKey: ["audit-logs", "consumable-requests"],
    queryFn: () => auditLogsApi.listConsumableRequests(),
  });
}

export function usePurchaseOrdersHistoryQuery(): UseQueryResult<FlattenedLog[], Error> {
  return useQuery({
    queryKey: ["audit-logs", "purchase-orders-history"],
    queryFn: () => auditLogsApi.listPurchaseOrders(),
  });
}
