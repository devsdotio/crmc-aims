import type { UserRole } from "./users";

export type SettingsSection = "account" | "categories" | "departments";

/** Taxonomy row kinds managed under Category Management. */
export type CategoryType =
  | "asset"
  | "consumable"
  | "asset_class"
  | "consumable_class";

export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  colorToken?: string;
  iconToken?: string;
  /** Parent general class id when type=asset or type=consumable. */
  parentId?: string | null;
  /** Resolved parent general class name (list enrichment). */
  parentName?: string | null;
  itemCount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
}

export interface SystemBackupStatus {
  lastBackupDate: string;
  status: "success" | "failed" | "in_progress";
  autoBackupEnabled: boolean;
  totalRecordsCount: number;
}
