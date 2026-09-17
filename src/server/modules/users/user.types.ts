import type { AppRole, ProfileStatus } from "@/server/shared/roles";
import type { ActorContext } from "@/server/shared/auth";
import type { NewProfileRow, ProfileRow } from "@/server/db/schema";

export type ProfileWithDepartment = ProfileRow & {
  linkedDepartmentName: string | null;
  linkedDepartmentCode: string | null;
};

export interface ProfileDTO {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  status: ProfileStatus;
  department: string | null;
  departmentId: string | null;
  departmentCode: string | null;
  dateAdded: string;
  /** Human-relative display string ("Active now", "2 hours ago", …). */
  lastActive: string | null;
  /** ISO timestamp when last seen, or null if never. */
  lastActiveAt: string | null;
  createdByUserId: string | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: AppRole;
  departmentId?: string | null;
  tenantId?: string | null;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: AppRole;
  departmentId?: string | null;
  status?: ProfileStatus;
  /** When set, replaces the auth password (admin-set). */
  password?: string;
}

export interface ListUsersFilters {
  role?: AppRole;
  status?: ProfileStatus;
  search?: string;
  tenantId?: string;
}

export interface IProfileRepository {
  findByUserId(userId: string): Promise<ProfileWithDepartment | null>;
  findByEmail(email: string): Promise<ProfileWithDepartment | null>;
  findBorrowerByDepartmentId(
    departmentId: string
  ): Promise<ProfileRow | null>;
  list(filters?: ListUsersFilters): Promise<ProfileWithDepartment[]>;
  create(data: NewProfileRow): Promise<ProfileRow>;
  update(
    userId: string,
    data: Partial<Omit<ProfileRow, "userId" | "createdAt">>
  ): Promise<ProfileRow | null>;
  touchLastActive(userId: string): Promise<void>;
}

export type { ActorContext };
