import type { ConsumableRequest } from "@/features/consumable-requests/client";
import {
  deriveConsumableRequestKind,
  type ConsumableRequestKind,
} from "@/lib/consumable-classification";
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

export function portalKindFromConsumableRequest(
  row: ConsumableRequest
): ConsumableRequestKind {
  if (
    row.classification === "supply" ||
    row.classification === "material" ||
    row.classification === "mixed"
  ) {
    return row.classification;
  }
  return deriveConsumableRequestKind((row.lines ?? []).map((l) => l.classification));
}

export function mapConsumableRequestToPortal(
  row: ConsumableRequest
): PortalBorrowRequest {
  const requestedAt = row.requestedAt ?? "";
  const portalKind = portalKindFromConsumableRequest(row);
  const lines = row.lines ?? [];
  const totalRequested = lines.reduce((sum, l) => sum + (l.quantityRequested || 0), 0);
  const totalReleased = lines.reduce((sum, l) => sum + (l.quantityReleased || 0), 0);
  const totalRemaining = lines.reduce((sum, l) => sum + (l.quantityRemaining || 0), 0);
  return {
    id: row.id,
    requestCode: row.requestCode,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    requesterPhone: row.requesterPhone ?? "",
    department: row.department,
    departmentId: row.departmentId ?? null,
    requestType: null,
    requestedByName: row.requestedByName,
    submissionGroupId: row.submissionGroupId,
    relatedRequests: row.relatedRequests,
    items: lines.map((line) => ({
      itemDescription: line.itemName,
      consumableId: line.consumableId,
      assetCode: line.itemCode,
      category: line.category,
      classification: line.classification,
      quantity: line.quantityRequested,
      itemType: "consumable" as const,
      unit: line.unit,
      purpose: line.purpose,
    })),
    purpose: row.purpose,
    requestedAt,
    relativeTime: row.relativeTime,
    expectedReturnDate: null,
    status: row.status,
    notes: row.notes,
    rejectionReason: row.rejectionReason,
    cancellationReason: row.cancellationReason,
    approvedAt: row.approvedAt,
    approvedByName: row.approvedByName,
    releasedAt: row.releasedAt,
    releasedByName: row.releasedByName,
    releasedSummary:
      totalReleased > 0 || row.status === "released"
        ? { totalRequested, totalReleased, totalRemaining }
        : undefined,
    history: row.history.map((h) => ({
      id: h.id,
      action: h.action as PortalBorrowRequest["history"][number]["action"],
      actor: h.actor,
      timestamp: h.timestamp,
      note: h.note,
    })),
    requestedDateFrom: requestedAt.slice(0, 10),
    requestedDateTo: requestedAt.slice(0, 10),
    portalKind,
  };
}

export function portalRequestKindLabel(request: {
  requestType?: "borrowable" | "assignable" | null;
  items?: Array<{ itemType?: "asset" | "consumable"; classification?: "supply" | "material" }>;
  portalKind?: "supply" | "material" | "mixed" | "borrow" | "assign";
}): "Supplies" | "Materials" | "Mixed" | "Assignment" | "Borrow" {
  if (request.portalKind === "mixed") return "Mixed";
  if (request.portalKind === "material") return "Materials";
  if (request.portalKind === "supply") return "Supplies";
  const items = request.items ?? [];
  const allConsumable =
    items.length > 0 && items.every((item) => item.itemType === "consumable");
  if (allConsumable) {
    const derived = deriveConsumableRequestKind(items.map((i) => i.classification));
    if (derived === "mixed") return "Mixed";
    if (derived === "material") return "Materials";
    return "Supplies";
  }
  if (request.requestType === "assignable") return "Assignment";
  return "Borrow";
}
