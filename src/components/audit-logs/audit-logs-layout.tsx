"use client";

import React, { ReactNode } from "react";
import {
  Package,
  Layers,
  ClipboardList,
  FileSpreadsheet,
  ShoppingCart,
  History,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditLogTab } from "@/app/(private)/audit-logs/page";

interface TabDef {
  id: AuditLogTab;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface AuditLogsLayoutProps {
  activeTab: AuditLogTab;
  onTabChange: (tab: AuditLogTab) => void;
  counts?: Partial<Record<AuditLogTab, number>>;
  children: ReactNode;
}

export function AuditLogsLayout({
  activeTab,
  onTabChange,
  counts = {},
  children,
}: AuditLogsLayoutProps) {
  const tabs: TabDef[] = [
    {
      id: "assets",
      label: "Assets",
      icon: Package,
      count: counts["assets"],
    },
    {
      id: "consumables",
      label: "Consumables",
      icon: Layers,
      count: counts["consumables"],
    },
    {
      id: "requests",
      label: "Requests",
      icon: ClipboardList,
      count: counts["requests"],
    },
    {
      id: "requisitions",
      label: "Requisitions",
      icon: FileSpreadsheet,
      count: counts["requisitions"],
    },
    {
      id: "purchaseOrders",
      label: "Purchase Lots",
      icon: ShoppingCart,
      count: counts["purchaseOrders"],
    },
    {
      id: "general",
      label: "All Activity",
      icon: History,
      count: counts["general"],
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      <div className="px-4 md:px-6 border-b border-border bg-bg-subtle/70 shrink-0">
        <div className="flex gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 py-3.5 px-1 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-text-secondary hover:text-text hover:border-border"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-accent" : "text-text-secondary")} />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-full border transition-colors",
                      isActive
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-bg border-border text-text-secondary"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col">{children}</div>
    </div>
  );
}
