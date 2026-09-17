import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/server/db";
import { borrowRequests, consumableRequests } from "@/server/db/schema";
import { getTenantContext } from "@/server/shared/tenant-context";

export type LinkedRequestSummary = {
  id: string;
  requestCode: string;
  kind: "borrow" | "assign" | "supply";
  status: string;
};

/**
 * Multi-type wizard submits one row per workflow (borrow / assign / supplies).
 * `submission_group_id` ties those rows so UI can show the full contents together.
 */
export async function loadLinkedRequestSummaries(
  groupIds: Array<string | null | undefined>,
  tenantId?: string
): Promise<Map<string, LinkedRequestSummary[]>> {
  const unique = [
    ...new Set(
      groupIds.filter((id): id is string => Boolean(id && id.trim()))
    ),
  ];
  const map = new Map<string, LinkedRequestSummary[]>();
  if (unique.length === 0) return map;

  const db = getDb();
  const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;

  const assetConditions = [inArray(borrowRequests.submissionGroupId, unique)];
  const supplyConditions = [
    inArray(consumableRequests.submissionGroupId, unique),
  ];
  if (resolvedTenantId) {
    assetConditions.push(eq(borrowRequests.tenantId, resolvedTenantId));
    supplyConditions.push(eq(consumableRequests.tenantId, resolvedTenantId));
  }

  const [assetRows, supplyRows] = await Promise.all([
    db
      .select({
        id: borrowRequests.id,
        requestCode: borrowRequests.requestCode,
        requestType: borrowRequests.requestType,
        status: borrowRequests.status,
        submissionGroupId: borrowRequests.submissionGroupId,
      })
      .from(borrowRequests)
      .where(and(...assetConditions)),
    db
      .select({
        id: consumableRequests.id,
        requestCode: consumableRequests.requestCode,
        status: consumableRequests.status,
        submissionGroupId: consumableRequests.submissionGroupId,
      })
      .from(consumableRequests)
      .where(and(...supplyConditions)),
  ]);

  const push = (groupId: string, entry: LinkedRequestSummary) => {
    const list = map.get(groupId) ?? [];
    list.push(entry);
    map.set(groupId, list);
  };

  for (const row of assetRows) {
    if (!row.submissionGroupId) continue;
    push(row.submissionGroupId, {
      id: row.id,
      requestCode: row.requestCode,
      kind: row.requestType === "assignable" ? "assign" : "borrow",
      status: row.status,
    });
  }
  for (const row of supplyRows) {
    if (!row.submissionGroupId) continue;
    push(row.submissionGroupId, {
      id: row.id,
      requestCode: row.requestCode,
      kind: "supply",
      status: row.status,
    });
  }

  for (const [groupId, list] of map) {
    list.sort((a, b) => a.requestCode.localeCompare(b.requestCode));
    map.set(groupId, list);
  }

  return map;
}

export function relatedForRow(
  rowId: string,
  groupId: string | null | undefined,
  linked: Map<string, LinkedRequestSummary[]>
): LinkedRequestSummary[] {
  if (!groupId) return [];
  return (linked.get(groupId) ?? []).filter((entry) => entry.id !== rowId);
}
