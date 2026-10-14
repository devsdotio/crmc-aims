import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  assets,
  borrowRequests,
  consumables,
  maintenanceLogs,
  projects,
  purchaseLots,
} from "@/server/db/schema";
import type {
  CustomReportColumnDef,
  CustomReportColumnKey,
  CustomReportDataset,
  CustomReportDatasetMeta,
  CustomReportFilters,
} from "@/types/custom-reports";
import { ValidationError } from "@/server/shared/errors";

export type DatasetRow = Record<string, string | number | boolean | null>;

export interface DatasetQueryResult {
  rows: DatasetRow[];
  total: number;
}

interface DatasetDefinition extends CustomReportDatasetMeta {
  execute: (
    tenantId: string,
    filters: CustomReportFilters,
    columns: CustomReportColumnKey[],
    limit: number,
    offset: number
  ) => Promise<DatasetQueryResult>;
}

function col(
  key: string,
  label: string,
  type: CustomReportColumnDef["type"] = "string",
  sensitive = false
): CustomReportColumnDef {
  return { key, label, type, ...(sensitive ? { sensitive: true } : {}) };
}

function applySearch(
  conditions: SQL[],
  search: string | undefined,
  fields: AnyColumn[]
) {
  if (!search?.trim()) return;
  const pattern = `%${search.trim()}%`;
  const parts = fields.map((f) => ilike(f, pattern));
  if (parts.length === 1) {
    conditions.push(parts[0]!);
  } else {
    conditions.push(or(...parts)!);
  }
}

function pickColumns(
  raw: Record<string, unknown>,
  columns: CustomReportColumnKey[],
  allowlist: Set<string>
): DatasetRow {
  const out: DatasetRow = {};
  for (const key of columns) {
    if (!allowlist.has(key)) continue;
    const val = raw[key];
    if (val === undefined || val === null) {
      out[key] = null;
    } else if (typeof val === "boolean" || typeof val === "number") {
      out[key] = val;
    } else if (typeof val === "string") {
      out[key] = val;
    } else if (val instanceof Date) {
      out[key] = val.toISOString();
    } else {
      out[key] = String(val);
    }
  }
  return out;
}

function validateColumns(
  dataset: CustomReportDataset,
  columns: CustomReportColumnKey[]
): CustomReportColumnDef[] {
  const def = DATASET_MAP[dataset];
  if (!def) throw new ValidationError(`Unknown dataset: ${dataset}`);
  if (!columns.length) {
    throw new ValidationError("Select at least one column.");
  }
  const byKey = new Map(def.columns.map((c) => [c.key, c]));
  const resolved: CustomReportColumnDef[] = [];
  for (const key of columns) {
    const colDef = byKey.get(key);
    if (!colDef) {
      throw new ValidationError(`Column "${key}" is not allowed on dataset "${dataset}".`);
    }
    resolved.push(colDef);
  }
  return resolved;
}

const assetsDef: DatasetDefinition = {
  key: "assets",
  label: "Assets",
  description: "Capital equipment register",
  filterKeys: ["search", "department", "category", "classification", "status", "startDate", "endDate"],
  columns: [
    col("assetCode", "Asset code"),
    col("name", "Name"),
    col("category", "Category"),
    col("classification", "Classification"),
    col("status", "Status"),
    col("assignmentType", "Assignment type"),
    col("unit", "Unit"),
    col("location", "Location"),
    col("department", "Department"),
    col("currentHolder", "Current holder"),
    col("serialNumber", "Serial number"),
    col("purchaseDate", "Purchase date", "date"),
    col("value", "Value", "number", true),
    col("notes", "Notes"),
    col("createdAt", "Created at", "date"),
  ],
  async execute(tenantId, filters, columns, limit, offset) {
    const db = getDb();
    const conditions: SQL[] = [eq(assets.tenantId, tenantId), eq(assets.isSandbox, false)];
    applySearch(conditions, filters.search, [assets.assetCode, assets.name, assets.serialNumber]);
    if (filters.department) conditions.push(eq(assets.department, filters.department));
    if (filters.category) conditions.push(eq(assets.category, filters.category));
    if (filters.classification) conditions.push(eq(assets.classification, filters.classification));
    if (filters.status) conditions.push(sql`${assets.status} = ${filters.status}`);
    if (filters.startDate) conditions.push(gte(assets.purchaseDate, filters.startDate));
    if (filters.endDate) conditions.push(lte(assets.purchaseDate, filters.endDate));

    const where = and(...conditions);
    const [totalRow] = await db.select({ total: count() }).from(assets).where(where);
    const rowsRaw = await db
      .select({
        assetCode: assets.assetCode,
        name: assets.name,
        category: assets.category,
        classification: assets.classification,
        status: assets.status,
        assignmentType: assets.assignmentType,
        unit: assets.unit,
        location: assets.location,
        department: assets.department,
        currentHolder: assets.currentHolder,
        serialNumber: assets.serialNumber,
        purchaseDate: assets.purchaseDate,
        value: assets.value,
        notes: assets.notes,
        createdAt: assets.createdAt,
      })
      .from(assets)
      .where(where)
      .orderBy(desc(assets.createdAt))
      .limit(limit)
      .offset(offset);

    const allow = new Set(assetsDef.columns.map((c) => c.key));
    return {
      total: Number(totalRow?.total ?? 0),
      rows: rowsRaw.map((r) =>
        pickColumns(
          {
            ...r,
            value: r.value != null ? Number(r.value) : null,
            createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
          },
          columns,
          allow
        )
      ),
    };
  },
};

const consumablesDef: DatasetDefinition = {
  key: "consumables",
  label: "Consumables",
  description: "Stock items and thresholds",
  filterKeys: ["search", "category", "classification", "status"],
  columns: [
    col("itemCode", "Item code"),
    col("name", "Name"),
    col("category", "Category"),
    col("classification", "Classification"),
    col("categoryClass", "Category class"),
    col("unit", "Unit"),
    col("currentQty", "Current qty", "number"),
    col("reservedQty", "Reserved qty", "number"),
    col("minThreshold", "Min threshold", "number"),
    col("location", "Location"),
    col("supplier", "Supplier"),
    col("notes", "Notes"),
    col("lastRestocked", "Last restocked", "date"),
  ],
  async execute(tenantId, filters, columns, limit, offset) {
    const db = getDb();
    const conditions: SQL[] = [eq(consumables.tenantId, tenantId), eq(consumables.isSandbox, false)];
    applySearch(conditions, filters.search, [consumables.itemCode, consumables.name]);
    if (filters.category) conditions.push(eq(consumables.category, filters.category));
    if (filters.classification) conditions.push(eq(consumables.classification, filters.classification));
    if (filters.status === "low_stock") {
      conditions.push(sql`${consumables.currentQty} <= ${consumables.minThreshold}`);
    }

    const where = and(...conditions);
    const [totalRow] = await db.select({ total: count() }).from(consumables).where(where);
    const rowsRaw = await db
      .select({
        itemCode: consumables.itemCode,
        name: consumables.name,
        category: consumables.category,
        classification: consumables.classification,
        categoryClass: consumables.categoryClass,
        unit: consumables.unit,
        currentQty: consumables.currentQty,
        reservedQty: consumables.reservedQty,
        minThreshold: consumables.minThreshold,
        location: consumables.location,
        supplier: consumables.supplier,
        notes: consumables.notes,
        lastRestocked: consumables.lastRestocked,
      })
      .from(consumables)
      .where(where)
      .orderBy(desc(consumables.updatedAt))
      .limit(limit)
      .offset(offset);

    const allow = new Set(consumablesDef.columns.map((c) => c.key));
    return {
      total: Number(totalRow?.total ?? 0),
      rows: rowsRaw.map((r) =>
        pickColumns(
          {
            ...r,
            lastRestocked: r.lastRestocked?.toISOString?.() ?? r.lastRestocked,
          },
          columns,
          allow
        )
      ),
    };
  },
};

const purchaseOrdersDef: DatasetDefinition = {
  key: "purchase-orders",
  label: "Purchase orders",
  description: "Purchase lots / procurement receipts",
  filterKeys: ["search", "departmentId", "department", "status", "startDate", "endDate"],
  columns: [
    col("lotCode", "Lot code"),
    col("itemType", "Item type"),
    col("itemCode", "Item code"),
    col("itemName", "Item name"),
    col("supplierName", "Supplier"),
    col("departmentName", "Department"),
    col("projectName", "Project"),
    col("quantity", "Quantity", "number"),
    col("quantityRemaining", "Qty remaining", "number"),
    col("unitCost", "Unit cost", "number", true),
    col("totalCost", "Total cost", "number", true),
    col("purchasedOn", "Purchased on", "date"),
    col("reference", "Reference"),
    col("recordedByName", "Recorded by"),
    col("notes", "Notes"),
  ],
  async execute(tenantId, filters, columns, limit, offset) {
    const db = getDb();
    const conditions: SQL[] = [eq(purchaseLots.tenantId, tenantId)];
    applySearch(conditions, filters.search, [
      purchaseLots.lotCode,
      purchaseLots.itemCode,
      purchaseLots.itemName,
      purchaseLots.supplierName,
    ]);
    if (filters.departmentId) conditions.push(eq(purchaseLots.departmentId, filters.departmentId));
    if (filters.department) conditions.push(eq(purchaseLots.departmentName, filters.department));
    if (filters.status) conditions.push(sql`${purchaseLots.itemType} = ${filters.status}`);
    if (filters.startDate) conditions.push(gte(purchaseLots.purchasedOn, filters.startDate));
    if (filters.endDate) conditions.push(lte(purchaseLots.purchasedOn, filters.endDate));

    const where = and(...conditions);
    const [totalRow] = await db.select({ total: count() }).from(purchaseLots).where(where);
    const rowsRaw = await db
      .select({
        lotCode: purchaseLots.lotCode,
        itemType: purchaseLots.itemType,
        itemCode: purchaseLots.itemCode,
        itemName: purchaseLots.itemName,
        supplierName: purchaseLots.supplierName,
        departmentName: purchaseLots.departmentName,
        projectName: purchaseLots.projectName,
        quantity: purchaseLots.quantity,
        quantityRemaining: purchaseLots.quantityRemaining,
        unitCost: purchaseLots.unitCost,
        totalCost: purchaseLots.totalCost,
        purchasedOn: purchaseLots.purchasedOn,
        reference: purchaseLots.reference,
        recordedByName: purchaseLots.recordedByName,
        notes: purchaseLots.notes,
      })
      .from(purchaseLots)
      .where(where)
      .orderBy(desc(purchaseLots.purchasedOn))
      .limit(limit)
      .offset(offset);

    const allow = new Set(purchaseOrdersDef.columns.map((c) => c.key));
    return {
      total: Number(totalRow?.total ?? 0),
      rows: rowsRaw.map((r) =>
        pickColumns(
          {
            ...r,
            unitCost: r.unitCost != null ? Number(r.unitCost) : null,
            totalCost: r.totalCost != null ? Number(r.totalCost) : null,
          },
          columns,
          allow
        )
      ),
    };
  },
};

const requestsDef: DatasetDefinition = {
  key: "requests",
  label: "Borrow requests",
  description: "Asset borrow / assignment requests",
  filterKeys: ["search", "department", "departmentId", "status", "startDate", "endDate"],
  columns: [
    col("requestCode", "Request code"),
    col("requesterName", "Requester"),
    col("requesterEmail", "Email"),
    col("department", "Department"),
    col("requestType", "Request type"),
    col("purpose", "Purpose"),
    col("status", "Status"),
    col("expectedReturnDate", "Expected return", "date"),
    col("requestedByName", "Requested by"),
    col("assignedToName", "Assigned to"),
    col("pickedUpBy", "Picked up by"),
    col("requestedAt", "Requested at", "date"),
    col("notes", "Notes"),
  ],
  async execute(tenantId, filters, columns, limit, offset) {
    const db = getDb();
    const conditions: SQL[] = [eq(borrowRequests.tenantId, tenantId)];
    applySearch(conditions, filters.search, [
      borrowRequests.requestCode,
      borrowRequests.requesterName,
      borrowRequests.purpose,
    ]);
    if (filters.department) conditions.push(eq(borrowRequests.department, filters.department));
    if (filters.departmentId) conditions.push(eq(borrowRequests.departmentId, filters.departmentId));
    if (filters.status) conditions.push(sql`${borrowRequests.status} = ${filters.status}`);
    if (filters.startDate) {
      conditions.push(gte(borrowRequests.requestedAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(borrowRequests.requestedAt, end));
    }

    const where = and(...conditions);
    const [totalRow] = await db.select({ total: count() }).from(borrowRequests).where(where);
    const rowsRaw = await db
      .select({
        requestCode: borrowRequests.requestCode,
        requesterName: borrowRequests.requesterName,
        requesterEmail: borrowRequests.requesterEmail,
        department: borrowRequests.department,
        requestType: borrowRequests.requestType,
        purpose: borrowRequests.purpose,
        status: borrowRequests.status,
        expectedReturnDate: borrowRequests.expectedReturnDate,
        requestedByName: borrowRequests.requestedByName,
        assignedToName: borrowRequests.assignedToName,
        pickedUpBy: borrowRequests.pickedUpBy,
        requestedAt: borrowRequests.requestedAt,
        notes: borrowRequests.notes,
      })
      .from(borrowRequests)
      .where(where)
      .orderBy(desc(borrowRequests.requestedAt))
      .limit(limit)
      .offset(offset);

    const allow = new Set(requestsDef.columns.map((c) => c.key));
    return {
      total: Number(totalRow?.total ?? 0),
      rows: rowsRaw.map((r) =>
        pickColumns(
          {
            ...r,
            requestedAt: r.requestedAt?.toISOString?.() ?? r.requestedAt,
          },
          columns,
          allow
        )
      ),
    };
  },
};

const maintenanceDef: DatasetDefinition = {
  key: "maintenance",
  label: "Maintenance",
  description: "Maintenance / repair logs",
  filterKeys: ["search", "category", "status", "startDate", "endDate"],
  columns: [
    col("logCode", "Log code"),
    col("assetCode", "Asset code"),
    col("assetName", "Asset name"),
    col("category", "Category"),
    col("condition", "Condition"),
    col("source", "Source"),
    col("dateLogged", "Date logged", "date"),
    col("loggedByName", "Logged by"),
    col("isResolved", "Resolved", "boolean"),
    col("resolutionDate", "Resolution date", "date"),
    col("resolvedByName", "Resolved by"),
    col("repairCost", "Repair cost", "number", true),
    col("assignedToName", "Assigned to"),
    col("notes", "Notes"),
    col("workNotes", "Work notes"),
  ],
  async execute(tenantId, filters, columns, limit, offset) {
    const db = getDb();
    const conditions: SQL[] = [eq(maintenanceLogs.tenantId, tenantId)];
    applySearch(conditions, filters.search, [
      maintenanceLogs.logCode,
      maintenanceLogs.assetCode,
      maintenanceLogs.assetName,
    ]);
    if (filters.category) conditions.push(eq(maintenanceLogs.category, filters.category));
    if (filters.status === "open") conditions.push(eq(maintenanceLogs.isResolved, false));
    if (filters.status === "resolved") conditions.push(eq(maintenanceLogs.isResolved, true));
    if (filters.status && filters.status !== "open" && filters.status !== "resolved") {
      conditions.push(sql`${maintenanceLogs.condition} = ${filters.status}`);
    }
    if (filters.startDate) conditions.push(gte(maintenanceLogs.dateLogged, filters.startDate));
    if (filters.endDate) conditions.push(lte(maintenanceLogs.dateLogged, filters.endDate));

    const where = and(...conditions);
    const [totalRow] = await db.select({ total: count() }).from(maintenanceLogs).where(where);
    const rowsRaw = await db
      .select({
        logCode: maintenanceLogs.logCode,
        assetCode: maintenanceLogs.assetCode,
        assetName: maintenanceLogs.assetName,
        category: maintenanceLogs.category,
        condition: maintenanceLogs.condition,
        source: maintenanceLogs.source,
        dateLogged: maintenanceLogs.dateLogged,
        loggedByName: maintenanceLogs.loggedByName,
        isResolved: maintenanceLogs.isResolved,
        resolutionDate: maintenanceLogs.resolutionDate,
        resolvedByName: maintenanceLogs.resolvedByName,
        repairCost: maintenanceLogs.repairCost,
        assignedToName: maintenanceLogs.assignedToName,
        notes: maintenanceLogs.notes,
        workNotes: maintenanceLogs.workNotes,
      })
      .from(maintenanceLogs)
      .where(where)
      .orderBy(desc(maintenanceLogs.dateLogged))
      .limit(limit)
      .offset(offset);

    const allow = new Set(maintenanceDef.columns.map((c) => c.key));
    return {
      total: Number(totalRow?.total ?? 0),
      rows: rowsRaw.map((r) =>
        pickColumns(
          {
            ...r,
            repairCost: r.repairCost != null ? Number(r.repairCost) : null,
          },
          columns,
          allow
        )
      ),
    };
  },
};

const projectsDef: DatasetDefinition = {
  key: "projects",
  label: "Projects",
  description: "Project registry",
  filterKeys: ["search", "department", "status", "startDate", "endDate"],
  columns: [
    col("projectCode", "Project code"),
    col("name", "Name"),
    col("description", "Description"),
    col("status", "Status"),
    col("location", "Location"),
    col("department", "Department"),
    col("startDate", "Start date", "date"),
    col("endDate", "End date", "date"),
    col("budget", "Budget", "number", true),
    col("createdByName", "Created by"),
    col("notes", "Notes"),
    col("createdAt", "Created at", "date"),
  ],
  async execute(tenantId, filters, columns, limit, offset) {
    const db = getDb();
    const conditions: SQL[] = [eq(projects.tenantId, tenantId)];
    applySearch(conditions, filters.search, [projects.projectCode, projects.name, projects.description]);
    if (filters.department) conditions.push(eq(projects.department, filters.department));
    if (filters.status) conditions.push(sql`${projects.status} = ${filters.status}`);
    if (filters.startDate) conditions.push(gte(projects.startDate, filters.startDate));
    if (filters.endDate) conditions.push(lte(projects.endDate, filters.endDate));

    const where = and(...conditions);
    const [totalRow] = await db.select({ total: count() }).from(projects).where(where);
    const rowsRaw = await db
      .select({
        projectCode: projects.projectCode,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        location: projects.location,
        department: projects.department,
        startDate: projects.startDate,
        endDate: projects.endDate,
        budget: projects.budget,
        createdByName: projects.createdByName,
        notes: projects.notes,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    const allow = new Set(projectsDef.columns.map((c) => c.key));
    return {
      total: Number(totalRow?.total ?? 0),
      rows: rowsRaw.map((r) =>
        pickColumns(
          {
            ...r,
            budget: r.budget != null ? Number(r.budget) : null,
            createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
          },
          columns,
          allow
        )
      ),
    };
  },
};

const DATASET_LIST: DatasetDefinition[] = [
  assetsDef,
  consumablesDef,
  purchaseOrdersDef,
  requestsDef,
  maintenanceDef,
  projectsDef,
];

const DATASET_MAP = Object.fromEntries(DATASET_LIST.map((d) => [d.key, d])) as Record<
  CustomReportDataset,
  DatasetDefinition
>;

export function listDatasetMetadata(): CustomReportDatasetMeta[] {
  return DATASET_LIST.map(({ key, label, description, columns, filterKeys }) => ({
    key,
    label,
    description,
    columns,
    filterKeys,
  }));
}

export function getDatasetDefinition(dataset: CustomReportDataset): DatasetDefinition {
  const def = DATASET_MAP[dataset];
  if (!def) throw new ValidationError(`Unknown dataset: ${dataset}`);
  return def;
}

export function resolveDatasetColumns(
  dataset: CustomReportDataset,
  columns: CustomReportColumnKey[]
): CustomReportColumnDef[] {
  return validateColumns(dataset, columns);
}

export async function executeDatasetQuery(
  dataset: CustomReportDataset,
  tenantId: string,
  filters: CustomReportFilters,
  columns: CustomReportColumnKey[],
  limit: number,
  offset: number
): Promise<{ columns: CustomReportColumnDef[]; result: DatasetQueryResult }> {
  const resolved = validateColumns(dataset, columns);
  const def = getDatasetDefinition(dataset);
  const result = await def.execute(tenantId, filters, columns, limit, offset);
  return { columns: resolved, result };
}
