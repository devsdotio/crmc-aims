import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
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
  departments,
  maintenanceLogs,
  projects,
  purchaseLots,
  stockMovements,
} from "@/server/db/schema";
import type {
  CustomReportColumnDef,
  CustomReportColumnKey,
  CustomReportDataset,
  CustomReportDatasetMeta,
  CustomReportFilterFieldDef,
  CustomReportFilters,
} from "@/types/custom-reports";
import { normalizeCustomReportFilters } from "@/types/custom-reports";
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

function field(
  key: CustomReportFilterFieldDef["key"],
  label: string,
  control: CustomReportFilterFieldDef["control"],
  extra: Partial<CustomReportFilterFieldDef> = {}
): CustomReportFilterFieldDef {
  return { key, label, control, ...extra };
}

function hasValues(values?: string[]): values is string[] {
  return Array.isArray(values) && values.length > 0;
}

function applySearch(conditions: SQL[], search: string | undefined, fields: AnyColumn[]) {
  if (!search?.trim()) return;
  const pattern = `%${search.trim()}%`;
  const parts = fields.map((f) => ilike(f, pattern));
  if (parts.length === 1) {
    conditions.push(parts[0]!);
  } else {
    conditions.push(or(...parts)!);
  }
}

function applyIn(conditions: SQL[], column: AnyColumn, values?: string[]) {
  if (hasValues(values)) conditions.push(inArray(column, values));
}

async function resolveDepartmentNames(
  tenantId: string,
  filters: CustomReportFilters
): Promise<string[]> {
  const names = new Set(filters.departmentNames ?? []);
  if (hasValues(filters.departmentIds)) {
    const db = getDb();
    const rows = await db
      .select({ name: departments.name })
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, tenantId),
          inArray(departments.id, filters.departmentIds)
        )
      );
    for (const row of rows) names.add(row.name);
  }
  return [...names];
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

const ASSET_STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "needs_repair", label: "Needs repair" },
  { id: "out_of_service", label: "Out of service" },
  { id: "retired", label: "Retired" },
  { id: "missing", label: "Missing" },
];

const ASSIGNMENT_TYPE_OPTIONS = [
  { id: "borrowable", label: "Borrowable" },
  { id: "assignable", label: "Assignable" },
  { id: "fixed", label: "Fixed" },
];

const CONSUMABLE_STOCK_STATUS = [
  { id: "low_stock", label: "Low stock" },
  { id: "in_stock", label: "In stock (above threshold)" },
];

const ITEM_TYPE_OPTIONS = [
  { id: "asset", label: "Asset" },
  { id: "consumable", label: "Consumable" },
];

const REQUEST_STATUS_OPTIONS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "released", label: "Released" },
  { id: "unreleased", label: "Unreleased" },
  { id: "returned", label: "Returned" },
  { id: "cancelled", label: "Cancelled" },
];

const REQUEST_TYPE_OPTIONS = [
  { id: "borrowable", label: "Borrowable" },
  { id: "assignable", label: "Assignable" },
];

const MAINTENANCE_STATUS_OPTIONS = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
];

const MAINTENANCE_CONDITION_OPTIONS = [
  { id: "good", label: "Good" },
  { id: "needs_maintenance", label: "Needs maintenance" },
  { id: "damaged", label: "Damaged" },
  { id: "resolved", label: "Resolved" },
];

const PROJECT_STATUS_OPTIONS = [
  { id: "draft", label: "Draft" },
  { id: "active", label: "Active" },
  { id: "on_hold", label: "On hold" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const STOCK_REASON_OPTIONS = [
  { id: "restock", label: "Restock" },
  { id: "issue", label: "Issue / consumed" },
  { id: "adjust", label: "Adjustment" },
];

const STOCK_DIRECTION_OPTIONS = [
  { id: "in", label: "In" },
  { id: "out", label: "Out" },
];

const assetsDef: DatasetDefinition = {
  key: "assets",
  label: "Assets",
  description: "Capital equipment register",
  filterFields: [
    field("search", "Search", "search", { filterKey: "search" }),
    field("departments", "Departments", "multi", {
      filterKey: "departmentIds",
      optionsSource: "departments",
      searchable: true,
    }),
    field("categories", "Categories", "multi", {
      filterKey: "categories",
      optionsSource: "assetCategories",
      searchable: true,
    }),
    field("classifications", "Classes", "multi", {
      filterKey: "classifications",
      optionsSource: "assetClasses",
      searchable: true,
    }),
    field("statuses", "Status", "multi", {
      filterKey: "statuses",
      optionsSource: "static",
      staticOptions: ASSET_STATUS_OPTIONS,
    }),
    field("assignmentTypes", "Assignment type", "multi", {
      filterKey: "assignmentTypes",
      optionsSource: "static",
      staticOptions: ASSIGNMENT_TYPE_OPTIONS,
    }),
    field("assets", "Specific assets", "multi", {
      filterKey: "assetIds",
      optionsSource: "assets",
      searchable: true,
    }),
    field("dateRange", "Purchase date", "dateRange"),
  ],
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
    const deptNames = await resolveDepartmentNames(tenantId, filters);
    applyIn(conditions, assets.department, deptNames);
    applyIn(conditions, assets.category, filters.categories);
    applyIn(conditions, assets.classification, filters.classifications);
    applyIn(conditions, assets.status, filters.statuses);
    applyIn(conditions, assets.assignmentType, filters.assignmentTypes);
    applyIn(conditions, assets.id, filters.assetIds);
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
  label: "Consumables (on-hand)",
  description: "Current stock levels by item",
  filterFields: [
    field("search", "Search", "search", { filterKey: "search" }),
    field("categories", "Categories", "multi", {
      filterKey: "categories",
      optionsSource: "consumableCategories",
      searchable: true,
    }),
    field("classifications", "Supply / material", "multi", {
      filterKey: "classifications",
      optionsSource: "static",
      staticOptions: [
        { id: "supply", label: "Supply" },
        { id: "material", label: "Material" },
      ],
    }),
    field("statuses", "Stock status", "multi", {
      filterKey: "statuses",
      optionsSource: "static",
      staticOptions: CONSUMABLE_STOCK_STATUS,
    }),
    field("consumables", "Specific items", "multi", {
      filterKey: "consumableIds",
      optionsSource: "consumables",
      searchable: true,
    }),
  ],
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
    applyIn(conditions, consumables.category, filters.categories);
    applyIn(conditions, consumables.classification, filters.classifications);
    applyIn(conditions, consumables.id, filters.consumableIds);
    if (hasValues(filters.statuses)) {
      const parts: SQL[] = [];
      if (filters.statuses.includes("low_stock")) {
        parts.push(sql`${consumables.currentQty} <= ${consumables.minThreshold}`);
      }
      if (filters.statuses.includes("in_stock")) {
        parts.push(sql`${consumables.currentQty} > ${consumables.minThreshold}`);
      }
      if (parts.length === 1) conditions.push(parts[0]!);
      else if (parts.length > 1) conditions.push(or(...parts)!);
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
            currentQty: Number(r.currentQty),
            reservedQty: Number(r.reservedQty),
            minThreshold: Number(r.minThreshold),
            lastRestocked: r.lastRestocked?.toISOString?.() ?? r.lastRestocked,
          },
          columns,
          allow
        )
      ),
    };
  },
};

const stockMovementsDef: DatasetDefinition = {
  key: "stock-movements",
  label: "Consumable movements",
  description: "Issues / restocks / adjustments by department or project",
  filterFields: [
    field("search", "Search", "search", { filterKey: "search" }),
    field("departments", "Departments", "multi", {
      filterKey: "departmentIds",
      optionsSource: "departments",
      searchable: true,
    }),
    field("projects", "Projects", "multi", {
      filterKey: "projectIds",
      optionsSource: "projects",
      searchable: true,
    }),
    field("categories", "Item categories", "multi", {
      filterKey: "categories",
      optionsSource: "consumableCategories",
      searchable: true,
    }),
    field("consumables", "Specific items", "multi", {
      filterKey: "consumableIds",
      optionsSource: "consumables",
      searchable: true,
    }),
    field("reasons", "Reason", "multi", {
      filterKey: "reasons",
      optionsSource: "static",
      staticOptions: STOCK_REASON_OPTIONS,
    }),
    field("directions", "Direction", "multi", {
      filterKey: "directions",
      optionsSource: "static",
      staticOptions: STOCK_DIRECTION_OPTIONS,
    }),
    field("dateRange", "Movement date", "dateRange"),
  ],
  columns: [
    col("movementCode", "Movement code"),
    col("itemCode", "Item code"),
    col("itemName", "Item name"),
    col("category", "Category"),
    col("qty", "Qty", "number"),
    col("direction", "Direction"),
    col("reason", "Reason"),
    col("departmentName", "Department"),
    col("projectName", "Project"),
    col("lotCode", "Lot code"),
    col("unitCost", "Unit cost", "number", true),
    col("lineTotal", "Line total", "number", true),
    col("actorName", "Actor"),
    col("notes", "Notes"),
    col("createdAt", "Date", "date"),
  ],
  async execute(tenantId, filters, columns, limit, offset) {
    const db = getDb();
    const conditions: SQL[] = [eq(stockMovements.tenantId, tenantId)];
    applySearch(conditions, filters.search, [
      stockMovements.movementCode,
      stockMovements.lotCode,
      stockMovements.actorName,
      consumables.itemCode,
      consumables.name,
    ]);
    applyIn(conditions, stockMovements.departmentId, filters.departmentIds);
    applyIn(conditions, stockMovements.projectId, filters.projectIds);
    applyIn(conditions, stockMovements.consumableId, filters.consumableIds);
    applyIn(conditions, consumables.category, filters.categories);
    applyIn(conditions, stockMovements.reason, filters.reasons);
    applyIn(conditions, stockMovements.direction, filters.directions);
    if (filters.startDate) {
      conditions.push(gte(stockMovements.createdAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(stockMovements.createdAt, end));
    }

    const where = and(...conditions);
    const [totalRow] = await db
      .select({ total: count() })
      .from(stockMovements)
      .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id))
      .where(where);

    const rowsRaw = await db
      .select({
        movementCode: stockMovements.movementCode,
        itemCode: consumables.itemCode,
        itemName: consumables.name,
        category: consumables.category,
        qty: stockMovements.qty,
        direction: stockMovements.direction,
        reason: stockMovements.reason,
        departmentId: stockMovements.departmentId,
        projectId: stockMovements.projectId,
        lotCode: stockMovements.lotCode,
        unitCost: stockMovements.unitCost,
        lineTotal: stockMovements.lineTotal,
        actorName: stockMovements.actorName,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(consumables, eq(stockMovements.consumableId, consumables.id))
      .where(where)
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit)
      .offset(offset);

    const deptIds = [
      ...new Set(rowsRaw.map((r) => r.departmentId).filter(Boolean) as string[]),
    ];
    const projectIds = [
      ...new Set(rowsRaw.map((r) => r.projectId).filter(Boolean) as string[]),
    ];
    const deptMap = new Map<string, string>();
    const projectMap = new Map<string, string>();
    if (deptIds.length) {
      const rows = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(and(eq(departments.tenantId, tenantId), inArray(departments.id, deptIds)));
      for (const r of rows) deptMap.set(r.id, r.name);
    }
    if (projectIds.length) {
      const rows = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(and(eq(projects.tenantId, tenantId), inArray(projects.id, projectIds)));
      for (const r of rows) projectMap.set(r.id, r.name);
    }

    const allow = new Set(stockMovementsDef.columns.map((c) => c.key));
    return {
      total: Number(totalRow?.total ?? 0),
      rows: rowsRaw.map((r) =>
        pickColumns(
          {
            movementCode: r.movementCode,
            itemCode: r.itemCode,
            itemName: r.itemName,
            category: r.category,
            qty: Number(r.qty),
            direction: r.direction,
            reason: r.reason,
            departmentName: r.departmentId ? deptMap.get(r.departmentId) ?? null : null,
            projectName: r.projectId ? projectMap.get(r.projectId) ?? null : null,
            lotCode: r.lotCode,
            unitCost: r.unitCost != null ? Number(r.unitCost) : null,
            lineTotal: r.lineTotal != null ? Number(r.lineTotal) : null,
            actorName: r.actorName,
            notes: r.notes,
            createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
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
  filterFields: [
    field("search", "Search", "search", { filterKey: "search" }),
    field("departments", "Departments", "multi", {
      filterKey: "departmentIds",
      optionsSource: "departments",
      searchable: true,
    }),
    field("projects", "Projects", "multi", {
      filterKey: "projectIds",
      optionsSource: "projects",
      searchable: true,
    }),
    field("itemTypes", "Item type", "multi", {
      filterKey: "itemTypes",
      optionsSource: "static",
      staticOptions: ITEM_TYPE_OPTIONS,
    }),
    field("dateRange", "Purchased on", "dateRange"),
  ],
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
    applyIn(conditions, purchaseLots.departmentId, filters.departmentIds);
    applyIn(conditions, purchaseLots.projectId, filters.projectIds);
    applyIn(conditions, purchaseLots.itemType, filters.itemTypes);
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
            quantity: Number(r.quantity),
            quantityRemaining: Number(r.quantityRemaining),
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
  filterFields: [
    field("search", "Search", "search", { filterKey: "search" }),
    field("departments", "Departments", "multi", {
      filterKey: "departmentIds",
      optionsSource: "departments",
      searchable: true,
    }),
    field("statuses", "Status", "multi", {
      filterKey: "statuses",
      optionsSource: "static",
      staticOptions: REQUEST_STATUS_OPTIONS,
    }),
    field("requestTypes", "Request type", "multi", {
      filterKey: "requestTypes",
      optionsSource: "static",
      staticOptions: REQUEST_TYPE_OPTIONS,
    }),
    field("dateRange", "Requested date", "dateRange"),
  ],
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
    applyIn(conditions, borrowRequests.departmentId, filters.departmentIds);
    const deptNames = await resolveDepartmentNames(tenantId, filters);
    if (hasValues(deptNames) && !hasValues(filters.departmentIds)) {
      applyIn(conditions, borrowRequests.department, deptNames);
    }
    applyIn(conditions, borrowRequests.status, filters.statuses);
    applyIn(conditions, borrowRequests.requestType, filters.requestTypes);
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
  description: "Maintenance / repair logs (filter by department via linked asset)",
  filterFields: [
    field("search", "Search", "search", { filterKey: "search" }),
    field("departments", "Departments (asset)", "multi", {
      filterKey: "departmentIds",
      optionsSource: "departments",
      searchable: true,
    }),
    field("categories", "Categories", "multi", {
      filterKey: "categories",
      optionsSource: "assetCategories",
      searchable: true,
    }),
    field("assets", "Specific assets", "multi", {
      filterKey: "assetIds",
      optionsSource: "assets",
      searchable: true,
    }),
    field("statuses", "Open / resolved", "multi", {
      filterKey: "statuses",
      optionsSource: "static",
      staticOptions: MAINTENANCE_STATUS_OPTIONS,
    }),
    field("conditions", "Condition", "multi", {
      filterKey: "conditions",
      optionsSource: "static",
      staticOptions: MAINTENANCE_CONDITION_OPTIONS,
    }),
    field("dateRange", "Date logged", "dateRange"),
  ],
  columns: [
    col("logCode", "Log code"),
    col("assetCode", "Asset code"),
    col("assetName", "Asset name"),
    col("department", "Department"),
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
    applyIn(conditions, maintenanceLogs.category, filters.categories);
    applyIn(conditions, maintenanceLogs.assetId, filters.assetIds);
    applyIn(conditions, maintenanceLogs.condition, filters.conditions);
    if (hasValues(filters.statuses)) {
      const parts: SQL[] = [];
      if (filters.statuses.includes("open")) parts.push(eq(maintenanceLogs.isResolved, false));
      if (filters.statuses.includes("resolved")) parts.push(eq(maintenanceLogs.isResolved, true));
      if (parts.length === 1) conditions.push(parts[0]!);
      else if (parts.length > 1) conditions.push(or(...parts)!);
    }
    const deptNames = await resolveDepartmentNames(tenantId, filters);
    if (hasValues(deptNames)) {
      conditions.push(inArray(assets.department, deptNames));
    }
    if (filters.startDate) conditions.push(gte(maintenanceLogs.dateLogged, filters.startDate));
    if (filters.endDate) conditions.push(lte(maintenanceLogs.dateLogged, filters.endDate));

    const where = and(...conditions);
    const [totalRow] = await db
      .select({ total: count() })
      .from(maintenanceLogs)
      .leftJoin(assets, eq(maintenanceLogs.assetId, assets.id))
      .where(where);

    const rowsRaw = await db
      .select({
        logCode: maintenanceLogs.logCode,
        assetCode: maintenanceLogs.assetCode,
        assetName: maintenanceLogs.assetName,
        department: assets.department,
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
      .leftJoin(assets, eq(maintenanceLogs.assetId, assets.id))
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
  filterFields: [
    field("search", "Search", "search", { filterKey: "search" }),
    field("departments", "Departments", "multi", {
      filterKey: "departmentIds",
      optionsSource: "departments",
      searchable: true,
    }),
    field("projects", "Specific projects", "multi", {
      filterKey: "projectIds",
      optionsSource: "projects",
      searchable: true,
    }),
    field("statuses", "Status", "multi", {
      filterKey: "statuses",
      optionsSource: "static",
      staticOptions: PROJECT_STATUS_OPTIONS,
    }),
    field("dateRange", "Project dates", "dateRange"),
  ],
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
    applyIn(conditions, projects.id, filters.projectIds);
    const deptNames = await resolveDepartmentNames(tenantId, filters);
    applyIn(conditions, projects.department, deptNames);
    applyIn(conditions, projects.status, filters.statuses);
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
  stockMovementsDef,
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
  return DATASET_LIST.map(({ key, label, description, columns, filterFields }) => ({
    key,
    label,
    description,
    columns,
    filterFields,
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
  const normalized = normalizeCustomReportFilters(filters);
  const result = await def.execute(tenantId, normalized, columns, limit, offset);
  return { columns: resolved, result };
}
