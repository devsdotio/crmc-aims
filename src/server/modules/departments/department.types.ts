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
  findById(id: string): Promise<Department | null>;
  findByCode(code: string): Promise<Department | null>;
  findByNameLower(name: string): Promise<Department | null>;
  list(filters?: ListDepartmentFilters): Promise<DepartmentListRow[]>;
  create(
    data: Omit<Department, "id" | "createdAt" | "updatedAt" | "tenantId">
  ): Promise<Department>;
  update(
    id: string,
    data: Partial<Pick<Department, "code" | "name" | "isSandbox">>
  ): Promise<Department | null>;
  delete(id: string): Promise<boolean>;
  countLinkedProfiles(id: string): Promise<number>;
}
