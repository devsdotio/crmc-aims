import type { SupplierRow } from "@/server/db/schema";

export type SupplierStatus = "active" | "inactive";

export type SupplierDTO = {
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
};

export type ListSupplierFilters = {
  search?: string;
  status?: SupplierStatus;
  activeOnly?: boolean;
};

export interface ISupplierRepository {
  findById(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<SupplierRow | null>;
  list(
    filters?: ListSupplierFilters,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<SupplierRow[]>;
  create(
    data: Omit<
      import("@/server/db/schema").NewSupplierRow,
      "id" | "createdAt" | "updatedAt"
    >,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<SupplierRow>;
  update(
    id: string,
    data: Partial<Omit<SupplierRow, "id" | "createdAt" | "supplierCode">>,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<SupplierRow | null>;
  delete(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<boolean>;
}
