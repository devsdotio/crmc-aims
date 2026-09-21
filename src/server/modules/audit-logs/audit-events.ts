export const AUDIT_ENTITY = {
  asset: "asset",
  borrowRequest: "borrow_request",
  borrowTransaction: "borrow_transaction",
  consumable: "consumable",
  consumableRequest: "consumable_request",
  purchaseOrder: "purchase_order",
  report: "report",
  user: "user",
  voucher: "voucher",
  pettyCash: "petty_cash",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY];

export const AUDIT_ACTION = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  approved: "approved",
  rejected: "rejected",
  cancelled: "cancelled",
  released: "released",
  returned: "returned",
  voided: "voided",
  statusChanged: "status_changed",
  retired: "retired",
  reportExported: "report_exported",
  reportPrintRequested: "report_print_requested",
  userRoleChanged: "user_role_changed",
  userActivated: "user_activated",
  userDeactivated: "user_deactivated",
} as const;

export type AuditActionType = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const CRITICAL_AUDIT_ACTIONS = new Set<string>([
  AUDIT_ACTION.approved,
  AUDIT_ACTION.rejected,
  AUDIT_ACTION.cancelled,
  AUDIT_ACTION.released,
  AUDIT_ACTION.returned,
  AUDIT_ACTION.voided,
  AUDIT_ACTION.statusChanged,
  AUDIT_ACTION.retired,
  AUDIT_ACTION.deleted,
  AUDIT_ACTION.userRoleChanged,
  AUDIT_ACTION.userActivated,
  AUDIT_ACTION.userDeactivated,
  AUDIT_ACTION.reportExported,
  AUDIT_ACTION.reportPrintRequested,
  "purchase_order_created",
  "purchase_order_updated",
  "purchase_order_approved",
  "purchase_order_ordered",
  "purchase_order_delivered",
  "purchase_order_cancelled",
]);

export const AUDIT_ACTION_GROUP = {
  critical: "critical",
  requests: "requests",
  custody: "custody",
  inventory: "inventory",
  procurement: "procurement",
  finance: "finance",
  users: "users",
  reports: "reports",
  all: "all",
} as const;

export type AuditActionGroup = (typeof AUDIT_ACTION_GROUP)[keyof typeof AUDIT_ACTION_GROUP];

export function compactAuditMetadata(
  input?: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!input) return null;
  const entries = Object.entries(input).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
  if (entries.length === 0) return null;
  return Object.fromEntries(entries);
}

