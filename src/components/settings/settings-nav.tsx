"use client";

import { User, Tags, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsSection } from "@/types/settings";
import type { UserRole } from "@/types/users";

export interface SettingsNavProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  userRole: UserRole;
}

export function SettingsNav({
  activeSection,
  onSectionChange,
  userRole,
}: SettingsNavProps) {
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  const navItems: {
    id: SettingsSection;
    label: string;
    description: string;
    icon: typeof User;
    adminOnly?: boolean;
  }[] = [
    {
      id: "account",
      label: "Account Profile",
      description: "Manage your profile details and security password",
      icon: User,
    },
    {
      id: "categories",
      label: "Categories",
      description: "Manage institutional asset and supply categories",
      icon: Tags,
      adminOnly: true,
    },
    {
      id: "departments",
      label: "Departments",
      description: "Department list used for logins and issue destinations",
      icon: Building2,
      adminOnly: true,
    },
  ];

  return (
    <nav
      aria-label="Settings section navigation"
      className="flex flex-col gap-1 w-full md:w-64 shrink-0 bg-bg border-b md:border-b-0 md:border-r border-border p-4"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary px-3 py-1 hidden md:block">
        Settings Menu
      </span>

      <div className="flex md:flex-col gap-1 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          // Hide admin-only sections for non-admin users
          if (item.adminOnly && !isAdmin) {
            return null;
          }

          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "group relative flex items-start gap-3 p-3 rounded-xl text-left transition-colors duration-150 cursor-pointer outline-none shrink-0",
                "focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "bg-bg-subtle text-text font-bold"
                  : "text-text-secondary hover:text-text hover:bg-bg-subtle/50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-bg-subtle text-text-secondary group-hover:bg-border/60"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="hidden md:block flex-1 min-w-0">
                <span className="text-xs font-bold block leading-tight">{item.label}</span>
                <span className="text-[11px] text-text-secondary/70 block mt-0.5 truncate">
                  {item.description}
                </span>
              </div>

              <span className="md:hidden text-xs font-semibold">{item.label}</span>

              {/* Active Accent Indicator Bar */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.75 md:h-auto md:top-2 md:bottom-2 md:left-0 md:w-1 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
