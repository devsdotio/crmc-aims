import type { ConsumableRequest } from "@/features/consumable-requests/client";
import type { BorrowRequest } from "@/types/borrow-requests";
import type { PortalBorrowRequest } from "./types";

export function mapBorrowRequestToPortal(
  row: BorrowRequest
): PortalBorrowRequest {
  const requestedAt = row.requestedAt ?? "";
  return {
    ...row,
    requestedDateFrom: requestedAt.slice(0, 10),
    requestedDateTo: (row.expectedReturnDate ?? requestedAt).slice(0, 10),
  };
}

export function mapConsumableRequestToPortal(
  row: ConsumableRequest
): PortalBorrowRequest {
  const requestedAt = row.requestedAt ?? "";
  return {
    id: row.id,
    requestCode: row.requestCode,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    requesterPhone: row.requesterPhone ?? "",
    department: row.department,
    requestType: null,
    requestedByName: row.requestedByName,
    submissionGroupId: row.submissionGroupId,
    relatedRequests: row.relatedRequests,
    items: (row.lines ?? []).map((line) => ({
      itemDescription: line.itemName,
      consumableId: line.consumableId,
      assetCode: line.itemCode,
      category: line.category,
      quantity: line.quantityRequested,
      itemType: "consumable" as const,
      unit: line.unit,
      purpose: line.purpose,
    })),
    purpose: row.purpose,
    requestedAt,
    relativeTime: row.relativeTime,
    expectedReturnDate: null,
    status:
      row.status === "released"
        ? "released"
        : row.status === "cancelled"
          ? "cancelled"
          : row.status,
    notes: row.notes,
    rejectionReason: row.rejectionReason,
    cancellationReason: row.cancellationReason,
    history: row.history.map((h) => ({
      id: h.id,
      action: h.action as PortalBorrowRequest["history"][number]["action"],
      actor: h.actor,
      timestamp: h.timestamp,
      note: h.note,
    })),
    requestedDateFrom: requestedAt.slice(0, 10),
    requestedDateTo: requestedAt.slice(0, 10),
    portalKind: "supply",
  };
}

export function portalRequestKindLabel(request: {
  requestType?: "borrowable" | "assignable" | null;
  items?: Array<{ itemType?: "asset" | "consumable" }>;
  portalKind?: "supply" | "borrow" | "assign";
}): "Supplies" | "Assignment" | "Borrow" {
  if (request.portalKind === "supply") return "Supplies";
  const items = request.items ?? [];
  const allConsumable =
    items.length > 0 && items.every((item) => item.itemType === "consumable");
  if (allConsumable) return "Supplies";
  if (request.requestType === "assignable") return "Assignment";
  return "Borrow";
}
