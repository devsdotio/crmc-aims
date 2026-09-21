import type { BaseFilterState } from "./filters";

export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  status: SupplierStatus;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFilterState extends BaseFilterState {
  status: string;
}

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};
