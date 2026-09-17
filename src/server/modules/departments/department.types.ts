import type { Department } from "@/server/db/schema";
import type { ProfileStatus } from "@/server/shared/roles";

export type DepartmentDTO = {
  id: string;
  code: string;
  name: string;
  isSandbox: boolean;
  /** Borrower account linked to this department, if any. */
  accountUserId: string | null;
  accountEmail: string | null;
  accountStatus: ProfileStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type ListDepartmentFilters = {
  search?: string;
  includeSandbox?: boolean;
};

export type DepartmentListRow = Department & {
  accountUserId: string | null;
  accountEmail: string | null;
  accountStatus: ProfileStatus | null;
};

export interface IDepartmentRepository {
  findById(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<Department | null>;
  findByCode(
    code: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<Department | null>;
  findByNameLower(
    name: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<Department | null>;
  list(
    filters?: ListDepartmentFilters,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<DepartmentListRow[]>;
  create(
    data: Omit<Department, "id" | "createdAt" | "updatedAt" | "tenantId"> & {
      tenantId?: string;
    },
    session?: import("@/server/db/transaction").DbSession
  ): Promise<Department>;
  update(
    id: string,
    data: Partial<Pick<Department, "code" | "name" | "isSandbox">>,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<Department | null>;
  delete(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<boolean>;
  countLinkedProfiles(
    id: string,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<number>;
}
