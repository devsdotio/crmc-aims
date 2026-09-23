export type PettyCashStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "completed"
  | "cancelled";

export type PettyCashCategory =
  | "supplies"
  | "transportation"
  | "meals"
  | "repairs"
  | "courier"
  | "emergency"
  | "other";

export interface PettyCashVoucher {
  id: string;
  pcvNumber: string;
  status: PettyCashStatus;
  voucherDate: string;
  payeeName: string;
  amount: string;
  category: string;
  purpose: string;
  particulars: string;
  receiptNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  purchaseOrderNumber: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departments?: Array<{ id: string; name: string }>;
  isLegacy: boolean;
  createdByUserId: string;
  createdByName: string;
  approvedByUserId: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  completedByUserId: string | null;
  completedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PETTY_CASH_CATEGORIES: { id: PettyCashCategory; label: string; description: string }[] = [
  { id: "supplies", label: "Office & Operating Supplies", description: "Small stationery, cleaning items, urgent tools" },
  { id: "transportation", label: "Transportation & Fuel", description: "Fare, gas, toll, parking slips" },
  { id: "meals", label: "Meals & Representation", description: "Meeting refreshments, overtime meals" },
  { id: "repairs", label: "Emergency Repairs", description: "Immediate minor fixes, plumbing, hardware replacement" },
  { id: "courier", label: "Courier & Postage", description: "Urgent package deliveries, freight, mailing" },
  { id: "emergency", label: "Emergency Purchase", description: "Urgent operational or medical supplies" },
  { id: "other", label: "Miscellaneous / Other", description: "Other quick petty cash expenses" },
];
