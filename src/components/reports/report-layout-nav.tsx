"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  FolderKanban,
  Building2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReportTimeframe } from "./report-timeframe-context";

const REPORT_TABS = [
  {
    name: "Executive Overview",
    shortName: "Overview",
    href: "/reports",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Asset Register",
    shortName: "Assets",
    href: "/reports/assets",
    icon: Package,
    exact: false,
  },
  {
    name: "Consumables Stock",
    shortName: "Consumables",
    href: "/reports/consumables",
    icon: Layers,
    exact: false,
  },
  {
    name: "Project Reports",
    shortName: "Projects",
    href: "/reports/projects",
    icon: FolderKanban,
    exact: false,
  },
  {
    name: "Department Reports",
    shortName: "Departments",
    href: "/reports/departments",
    icon: Building2,
    exact: false,
  },
  {
    name: "Maintenance & Repairs",
    shortName: "Maintenance",
    href: "/reports/maintenance",
    icon: Wrench,
    exact: false,
  },
];

export function ReportLayoutNav() {
  const pathname = usePathname();
  const { timeframe } = useReportTimeframe();

  const queryString = (() => {
    const sp = new URLSearchParams();
    if (timeframe.startDate) sp.set("startDate", timeframe.startDate);
    if (timeframe.endDate) sp.set("endDate", timeframe.endDate);
    const s = sp.toString();
    return s ? `?${s}` : "";
  })();

  return (
    <div className="w-full rounded-t-2xl border-t border-x border-b border-border/60 bg-[#F0F1F5] dark:bg-card/90 pt-1 sm:pt-1.5 px-1 sm:px-1.5 pb-0 shadow-2xs shrink-0 select-none overflow-hidden">
      {/* ── Browser Tab Strip (Seamlessly attached to the card below) ── */}
      <nav
        className="flex items-end w-full gap-1 min-w-0"
        aria-label="Reports Navigation Tabs"
      >
        {REPORT_TABS.map((tab, idx) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const nextTab = REPORT_TABS[idx + 1];
          const isNextActive = nextTab
            ? nextTab.exact
              ? pathname === nextTab.href
              : pathname === nextTab.href || pathname.startsWith(`${nextTab.href}/`)
            : false;
          const showDivider = !isActive && !isNextActive && idx < REPORT_TABS.length - 1;
          const Icon = tab.icon;
          const tabHref = `${tab.href}${queryString}`;

          return (
            <div key={tab.href} className="relative flex-1 min-w-0 flex items-end">
              <Link
                href={tabHref}
                title={tab.name}
                className={cn(
                  "group relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 w-full h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold transition-all duration-150 rounded-t-xl cursor-pointer min-w-0",
                  isActive
                    ? "bg-card text-text font-bold shadow-xs border-t-2 border-t-accent border-x border-border/90 -mb-px z-10"
                    : "text-text-secondary/80 hover:text-text hover:bg-card/60 border-t-2 border-transparent border-x"
                )}
              >
                {/* Tab Favicon Icon */}
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center transition-colors",
                    isActive
                      ? "text-accent"
                      : "text-text-secondary/75 group-hover:text-text"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>

                {/* Tab Label: Full on medium+, Short on mobile */}
                <span className="truncate hidden md:inline">
                  {tab.name}
                </span>
                <span className="truncate md:hidden inline">
                  {tab.shortName}
                </span>

                {/* Active Live Indicator */}
                {isActive && (
                  <span className="ml-auto hidden xl:flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse shrink-0" />
                )}
              </Link>

              {/* Subtle tab separator divider between inactive tabs */}
              {showDivider && (
                <span
                  className="absolute right-0 top-2.5 bottom-2.5 w-px bg-border/60 pointer-events-none hidden sm:block"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
