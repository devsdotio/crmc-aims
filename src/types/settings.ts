import type { UserRole } from "./users";

export type SettingsSection = "account" | "categories" | "departments";

export type CategoryType = "asset" | "consumable";

export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  colorToken?: string;
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
