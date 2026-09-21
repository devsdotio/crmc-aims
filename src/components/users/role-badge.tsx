"use client";

import { Shield, ShieldCheck, UserCheck, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/users";
import { ROLE_DEFINITIONS } from "@/constants/roles";

export interface RoleBadgeProps {
  role: UserRole;
  className?: string;
  showIcon?: boolean;
}

const ROLE_ICONS: Record<UserRole, typeof ShieldCheck> = {
  superadmin: Shield,
  admin: ShieldCheck,
  staff: UserCheck,
  borrower: Hand,
};

export function RoleBadge({
  role,
  className,
  showIcon = true,
}: RoleBadgeProps) {
  const def = ROLE_DEFINITIONS[role];
  const Icon = ROLE_ICONS[role];

  const styleClass = {
    filled: "bg-primary text-primary-foreground font-bold shadow-2xs border border-primary",
    outlined: "bg-bg text-text font-semibold border border-border shadow-2xs",
    muted: "bg-bg-subtle text-text-secondary font-medium border border-border/60",
  }[def.badgeStyle];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs whitespace-nowrap",
        styleClass,
        className
      )}
      title={def.description}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{def.title}</span>
    </span>
  );
}
