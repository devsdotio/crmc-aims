"use client";

import Link from "next/link";
import { PackagePlus, RotateCcw, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
}

export interface QuickActionsBarProps {
  actions?: QuickAction[];
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: "Add Asset",            href: "/assets/new",        icon: PackagePlus, primary: true },
  // { label: "Log Return",           href: "/borrow-log/return",  icon: RotateCcw },
  { label: "Add Consumable Stock", href: "/consumables/restock", icon: Boxes },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickActionsBar({ actions = DEFAULT_ACTIONS }: QuickActionsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick actions">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent",
              action.primary
                ? [
                    "bg-primary text-primary-foreground",
                    "hover:bg-accent focus-visible:ring-offset-bg",
                  ]
                : [
                    "border border-border bg-bg text-text",
                    "hover:border-primary hover:bg-bg-subtle",
                  ]
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
