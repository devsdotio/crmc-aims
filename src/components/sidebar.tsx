"use client";

import type { UserRole } from "@/types/users";

import Link from "next/link";
import Image from "next/image";
import { Krona_One } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Repeat,
  Boxes,
  Users,
  Settings,
  LogOut,
  User,
  History,
  PanelLeftClose,
  FolderKanban,
  Truck,
  ShoppingCart,
  Wrench,
  FileText,
  Tags,
  Building2,
  Receipt,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { performSignOut } from "@/lib/auth/sign-out-client";
import { cn } from "@/lib/utils";

const kronaOne = Krona_One({
  weight: "400",
  subsets: ["latin"],
});

interface NavSubItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeTone?: "accent" | "warning";
  badgeText?: string;
  roles?: UserRole[];
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeTone?: "accent" | "warning";
  badgeText?: string;
  disabled?: boolean;
  roles?: UserRole[];
  children?: NavSubItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  className?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
  pendingCount?: number;
  pendingAssignCount?: number;
  pendingBorrowCount?: number;
  pendingSupplyCount?: number;
  lowStockCount?: number;
  overdueCount?: number;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  onLogout?: () => void;
}

export default function Sidebar({
  className,
  onCollapsedChange,
  pendingCount = 0,
  pendingAssignCount = 0,
  pendingBorrowCount = 0,
  pendingSupplyCount = 0,
  lowStockCount = 0,
  overdueCount = 0,
  userName = "Unknown user",
  userEmail = "",
  userRole,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      "/purchase-orders": true,
      "/consumables": true,
    };
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/purchase-orders")) {
        initial["/purchase-orders"] = true;
      }
      if (path.startsWith("/consumables")) {
        initial["/consumables"] = true;
      }
      if (path.startsWith("/borrow-requests")) {
        initial["/borrow-requests/assign"] = true;
      }
      if (path.startsWith("/disbursements")) {
        initial["/disbursements/vouchers"] = true;
      }
    }
    return initial;
  });

  // Keep known accordion sections open while browsing their subpages.
  useEffect(() => {
    const sectionRoots: Array<{ key: string; match: (path: string) => boolean }> = [
      {
        key: "/borrow-requests/assign",
        match: (path) => path.startsWith("/borrow-requests"),
      },
      {
        key: "/purchase-orders",
        match: (path) => path.startsWith("/purchase-orders"),
      },
      {
        key: "/consumables",
        match: (path) => path.startsWith("/consumables"),
      },
      {
        key: "/disbursements/vouchers",
        match: (path) => path.startsWith("/disbursements"),
      },
    ];
    setOpenSubmenus((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const section of sectionRoots) {
        if (section.match(pathname) && next[section.key] !== true) {
          next[section.key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/purchase-orders")) {
      setOpenSubmenus((prev) => ({ ...prev, "/purchase-orders": true }));
    }
    if (pathname.startsWith("/consumables")) {
      setOpenSubmenus((prev) => ({ ...prev, "/consumables": true }));
    }
  }, [pathname]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setUserMenuOpen(false);

    if (onLogout) {
      onLogout();
      return;
    }

    setIsLoggingOut(true);
    try {
      queryClient.clear();
      await performSignOut();
    } catch {
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.replace("/sign-in");
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigateProfile = () => {
    setUserMenuOpen(false);
    router.push("/profile");
  };

  // Close user menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  // Close the user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allSections: NavSection[] = [
    {
      label: "Platform",
      items: [
        {
          name: "Platform Overview",
          href: "/platform",
          icon: LayoutDashboard,
          roles: ["superadmin"],
        },
        {
          name: "Institutions & Tenants",
          href: "/platform/tenants",
          icon: Building2,
          roles: ["superadmin"],
        },
        {
          name: "User Governance",
          href: "/users",
          icon: Users,
          roles: ["superadmin"],
        },
      ],
    },
    {
      label: "Overview",
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          roles: ["admin", "staff"],
        },
        {
          name: "Dashboard",
          href: "/borrower-db/dashboard",
          icon: LayoutDashboard,
          roles: ["borrower"],
        },
      ],
    },
    {
      label: "Request",
      items: [
        {
          name: "Assign",
          href: "/borrower-db/requests/assignment",
          icon: ClipboardList,
          badge: pendingAssignCount,
          badgeTone: "accent",
          roles: ["borrower"],
        },
        {
          name: "Borrow",
          href: "/borrower-db/requests/borrow",
          icon: Repeat,
          badge: pendingBorrowCount,
          badgeTone: "accent",
          roles: ["borrower"],
        },
        {
          name: "Supplies",
          href: "/borrower-db/requests/supplies",
          icon: Boxes,
          badge: pendingSupplyCount,
          badgeTone: "accent",
          roles: ["borrower"],
        },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          name: "Assets",
          href: "/assets",
          icon: Package,
          roles: ["admin", "staff"],
        },
        {
          name: "Assets",
          href: "/borrower-db/assets",
          icon: Package,
          roles: ["borrower"],
        },
        {
          name: "Supplies",
          href: "/borrower-db/supplies",
          icon: Boxes,
          roles: ["borrower"],
        },
        {
          name: "Inventory",
          href: "/consumables",
          icon: Boxes,
          badge: lowStockCount,
          badgeTone: "warning",
          roles: ["admin", "staff"],
          children: [
            {
              name: "Supplies",
              href: "/consumables/supplies",
            },
            {
              name: "Materials",
              href: "/consumables/materials",
            },
          ],
        },
        {
          name: "Requests",
          href: "/borrow-requests/assign",
          icon: ClipboardList,
          badge: pendingCount,
          badgeTone: "accent",
          roles: ["admin", "staff"],
          children: [
            {
              name: "Assign",
              href: "/borrow-requests/assign",
              badge: pendingAssignCount,
              badgeTone: "accent",
            },
            {
              name: "Borrow",
              href: "/borrow-requests/borrow",
              badge: pendingBorrowCount,
              badgeTone: "accent",
            },
            {
              name: "Supplies",
              href: "/borrow-requests/supplies",
              badge: pendingSupplyCount,
              badgeTone: "accent",
            },
          ],
        },
        {
          name: "Purchase Orders",
          href: "/purchase-orders",
          icon: ShoppingCart,
          roles: ["admin", "staff"],
          children: [
            {
              name: "Asset",
              href: "/purchase-orders/asset",
            },
            {
              name: "Supplies",
              href: "/purchase-orders/supplies",
            },
            {
              name: "Materials",
              href: "/purchase-orders/materials",
            },
            {
              name: "Projects",
              href: "/purchase-orders/projects",
            },
          ],
        },
        {
          name: "Disbursements",
          href: "/disbursements/vouchers",
          icon: Receipt,
          roles: ["admin", "staff"],
          children: [
            {
              name: "Vouchers",
              href: "/disbursements/vouchers",
            },
            {
              name: "Petty Cash",
              href: "/disbursements/petty-cash",
            },
          ],
        },
        {
          name: "Suppliers",
          href: "/suppliers",
          icon: Truck,
          roles: ["admin", "staff"],
        },
        {
          name: "Projects",
          href: "/projects",
          icon: FolderKanban,
          roles: ["admin"],
        },
      ],
    },
    {
      label: "Logs & History",
      items: [
        {
          name: "Custody Log",
          href: "/borrow-log",
          icon: Repeat,
          badge: overdueCount,
          badgeTone: "warning",
          roles: ["admin", "staff"],
        },
        {
          name: "Issue History",
          href: "/issue-history",
          icon: History,
          roles: ["admin", "staff"],
        },
        {
          name: "Maintenance Logs",
          href: "/maintenance-logs",
          icon: Wrench,
          roles: ["admin", "staff"],
        },
        {
          name: "Audit Trails",
          href: "/audit-trails",
          icon: History,
          badgeText: "Beta",
          roles: ["admin", "staff"],
        },
        {
          name: "Borrow History",
          href: "/borrower-db/history",
          icon: History,
          roles: ["borrower"],
        },
      ],
    },
    {
      label: "Administration",
      items: [
        {
          name: "Reports",
          href: "/reports",
          icon: FileText,
          badgeText: "Beta",
          roles: ["admin", "staff"],
        },
        {
          name: "Users",
          href: "/users",
          icon: Users,
          roles: ["admin"],
        },
        {
          name: "Categories",
          href: "/categories",
          icon: Tags,
          roles: ["admin"],
        },
        {
          name: "Departments",
          href: "/departments",
          icon: Building2,
          roles: ["admin"],
        },
      ],
    },
  ];

  // Filter sections and items based on user role
  const sections = allSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter(
          (item) => !item.roles || (userRole && item.roles.includes(userRole)),
        )
        .map((item) => ({
          ...item,
          children: item.children?.filter(
            (child) =>
              !child.roles || (userRole && child.roles.includes(userRole)),
          ),
        })),
    }))
    .filter((section) => section.items.length > 0);

  const handleToggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onCollapsedChange?.(next);
  };

  const renderNavItem = (item: NavItem) => {
    const isDisabled = Boolean(item.disabled || item.badgeText === "Soon");
    const isExactActive = !isDisabled && pathname === item.href;
    const isChildActive =
      !isDisabled &&
      Boolean(item.children?.some((child) => pathname === child.href));
    const isActive = isExactActive || isChildActive;
    const Icon = item.icon;
    const hasBadge = (item.badge ?? 0) > 0;
    const hasBadgeText = Boolean(item.badgeText);
    const badgeClass =
      item.badgeTone === "accent"
        ? "bg-blue-100 text-primary"
        : "bg-status-repair-bg text-status-repair-text";

    if (isDisabled) {
      return (
        <div
          key={item.href}
          role="button"
          aria-disabled="true"
          tabIndex={-1}
          title={`${item.name} (Coming Soon)`}
          className={cn(
            "relative flex items-center rounded-lg text-sm font-medium select-none cursor-not-allowed opacity-50",
            isCollapsed
              ? "justify-center px-0 py-2.5 h-10 w-full"
              : "justify-between px-3 py-2.5",
            "text-white/40 hover:bg-transparent transition-colors group",
          )}
        >
          <span
            className={cn(
              "relative flex items-center min-w-0",
              isCollapsed ? "justify-center" : "gap-3",
            )}
          >
            <Icon className="w-4.5 h-4.5 shrink-0 text-white/30" />
            {!isCollapsed && <span className="truncate text-white/40">{item.name}</span>}
          </span>

          {!isCollapsed && hasBadgeText && (
            <span className="relative flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-md shrink-0 bg-accent/15 text-accent border border-accent/25">
              {item.badgeText}
            </span>
          )}

          {/* Collapsed-state tooltip */}
          {isCollapsed && (
            <div
              role="tooltip"
              className={cn(
                "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50",
                "flex items-center gap-2 whitespace-nowrap rounded-md border border-white/10 bg-[#0F1329]",
                "px-2.5 py-1.5 text-xs text-white shadow-lg shadow-black/30",
                "opacity-0 scale-95 origin-left transition-all duration-150",
                "group-hover:opacity-100 group-hover:scale-100",
              )}
            >
              {item.name}
              {hasBadgeText && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-accent/20 text-accent">
                  {item.badgeText}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (item.children && item.children.length > 0) {
      const firstChildHref = item.children[0]?.href ?? item.href;
      const isSubmenuOpen = openSubmenus[item.href] ?? isChildActive;

      if (isCollapsed) {
        return (
          <div
            key={item.href}
            className="relative group/collapsed flex items-center justify-center w-full"
          >
            <Link
              href={firstChildHref}
              onClick={() =>
                setOpenSubmenus((prev) => ({ ...prev, [item.href]: true }))
              }
              aria-current={isExactActive ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center rounded-lg text-sm font-medium h-10 w-full outline-none focus-visible:ring-2 focus-visible:ring-accent/70 transition-colors duration-150",
                isActive
                  ? "text-white font-semibold"
                  : "text-white/60 hover:text-white hover:bg-white/6",
              )}
            >
              {isExactActive && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/10"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon
                className={cn(
                  "w-4.5 h-4.5 shrink-0 transition-transform duration-150 group-hover/collapsed:scale-110",
                  isActive
                    ? "text-accent"
                    : "text-white/50 group-hover/collapsed:text-white",
                )}
              />
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.75 rounded-r-full bg-accent" />
              )}
            </Link>

            {/* Flyout popup for collapsed sidebar */}
            <div
              className={cn(
                "invisible opacity-0 pointer-events-none group-hover/collapsed:visible group-hover/collapsed:opacity-100 group-hover/collapsed:pointer-events-auto",
                "absolute left-full top-0 ml-2 z-50 min-w-44 py-1.5 px-1.5 rounded-xl border border-white/15 bg-[#0F1329]/95 backdrop-blur-md shadow-xl shadow-black/40",
                "scale-95 group-hover/collapsed:scale-100 origin-top-left transition-all duration-150",
              )}
            >
              {/* Hover bridge */}
              <div className="absolute -left-2 top-0 bottom-0 w-2" />

              <Link
                href={firstChildHref}
                onClick={() =>
                  setOpenSubmenus((prev) => ({ ...prev, [item.href]: true }))
                }
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold mb-1 border-b border-white/10 transition-colors",
                  isExactActive
                    ? "text-accent bg-accent/15"
                    : "text-white hover:bg-white/10",
                )}
              >
                <span>{item.name}</span>
                <span className="text-[10px] text-white/40 font-normal">
                  {item.children[0]?.name ?? "Open"}
                </span>
              </Link>

              <div className="space-y-0.5">
                {item.children.map((subItem) => {
                  const isSubActive = pathname === subItem.href;
                  const subBadge = subItem.badge ?? 0;
                  const subBadgeClass =
                    subItem.badgeTone === "accent"
                      ? "bg-blue-100 text-primary"
                      : "bg-status-repair-bg text-status-repair-text";
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      aria-current={isSubActive ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isSubActive
                          ? "text-accent bg-accent/10 font-semibold"
                          : "text-white/70 hover:text-white hover:bg-white/10",
                      )}
                    >
                      <span className="truncate">{subItem.name}</span>
                      {subBadge > 0 && (
                        <span
                          className={cn(
                            "flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold rounded-full shrink-0 tabular-nums",
                            subBadgeClass,
                          )}
                        >
                          {subBadge > 99 ? "99+" : subBadge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      // Expanded mode with accordion
      return (
        <div key={item.href} className="space-y-0.5">
          <div className="relative flex items-center group">
            <Link
              href={firstChildHref}
              onClick={() =>
                setOpenSubmenus((prev) => ({ ...prev, [item.href]: true }))
              }
              aria-current={isExactActive ? "page" : undefined}
              className={cn(
                "relative flex-1 flex items-center justify-between rounded-lg text-sm font-medium py-2.5 pl-3 pr-2 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
                isExactActive
                  ? "text-white font-semibold"
                  : isChildActive
                    ? "text-white/90"
                    : "text-white/60 hover:text-white hover:bg-white/6",
              )}
            >
              {isExactActive && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/10"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}

              <span className="relative flex items-center min-w-0 gap-3">
                <Icon
                  className={cn(
                    "w-4.5 h-4.5 shrink-0 transition-transform duration-150 group-hover:scale-110",
                    isActive
                      ? "text-accent"
                      : "text-white/50 group-hover:text-white",
                  )}
                />
                <span className="truncate">{item.name}</span>
              </span>

              <span className="relative flex items-center gap-1.5 shrink-0">
                {hasBadge && (
                  <span
                    className={cn(
                      "flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold rounded-full tabular-nums",
                      badgeClass,
                    )}
                  >
                    {item.badge! > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>

              {isExactActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.75 rounded-r-full bg-accent" />
              )}
            </Link>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenSubmenus((prev) => ({
                  ...prev,
                  [item.href]: !isSubmenuOpen,
                }));
              }}
              aria-label={`Toggle ${item.name} subpages`}
              title={`Toggle ${item.name} subpages`}
              className={cn(
                "p-1.5 mr-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70",
                isSubmenuOpen && "text-white/80",
              )}
            >
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  isSubmenuOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {isSubmenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="overflow-hidden ml-5 pl-2.5 pr-0 space-y-0.5 border-l border-white/10 my-1"
              >
                {item.children.map((subItem) => {
                  const isSubActive = pathname === subItem.href;
                  const subBadge = subItem.badge ?? 0;
                  const subBadgeClass =
                    subItem.badgeTone === "accent"
                      ? "bg-blue-100 text-primary"
                      : "bg-status-repair-bg text-status-repair-text";
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      aria-current={isSubActive ? "page" : undefined}
                      className={cn(
                        "relative flex items-center justify-between gap-2 rounded-lg text-sm font-medium py-2.5 pl-3 pr-2 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
                        isSubActive
                          ? "text-accent font-semibold bg-accent/10 border border-accent/20"
                          : "text-white/65 hover:text-white hover:bg-white/6",
                      )}
                    >
                      <span className="truncate">{subItem.name}</span>
                      {subBadge > 0 && (
                        <span
                          className={cn(
                            "flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold rounded-full shrink-0 tabular-nums",
                            subBadgeClass,
                          )}
                        >
                          {subBadge > 99 ? "99+" : subBadge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex items-center rounded-lg text-sm font-medium",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
          "transition-colors duration-150 group",
          isCollapsed
            ? "justify-center px-0 py-2.5 h-10 w-full"
            : "justify-between px-3 py-2.5",
          isActive
            ? "text-white font-semibold"
            : "text-white/60 hover:text-white hover:bg-white/6",
        )}
      >
        {/* Animated active pill — shared layoutId glides between items */}
        {isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/10"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}

        <span
          className={cn(
            "relative flex items-center min-w-0",
            isCollapsed ? "justify-center" : "gap-3",
          )}
        >
          <Icon
            className={cn(
              "w-4.5 h-4.5 shrink-0 transition-transform duration-150 group-hover:scale-110",
              isActive ? "text-accent" : "text-white/50 group-hover:text-white",
            )}
          />
          {!isCollapsed && <span className="truncate">{item.name}</span>}
        </span>

        {!isCollapsed && hasBadge && (
          <span
            className={cn(
              "relative flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold rounded-full shrink-0 tabular-nums",
              badgeClass,
            )}
          >
            {item.badge! > 99 ? "99+" : item.badge}
          </span>
        )}

        {!isCollapsed && hasBadgeText && (
          <span className="relative flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-md shrink-0 bg-accent/15 text-accent border border-accent/25">
            {item.badgeText}
          </span>
        )}

        {/* Indicator dot when collapsed */}
        {isCollapsed && (hasBadge || hasBadgeText) && (
          <span
            className={cn(
              "absolute top-2 right-2 rounded-full",
              hasBadge
                ? cn("w-2 h-2", item.badgeTone === "accent" ? "bg-accent" : "bg-amber-400")
                : "w-1.5 h-1.5 bg-accent/80",
            )}
          />
        )}

        {/* Left accent bar on active item */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.75 rounded-r-full bg-accent" />
        )}

        {/* Collapsed-state tooltip */}
        {isCollapsed && (
          <div
            role="tooltip"
            className={cn(
              "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50",
              "flex items-center gap-2 whitespace-nowrap rounded-md border border-white/10 bg-[#0F1329]",
              "px-2.5 py-1.5 text-xs text-white shadow-lg shadow-black/30",
              "opacity-0 scale-95 origin-left transition-all duration-150",
              "group-hover:opacity-100 group-hover:scale-100",
            )}
          >
            {item.name}
            {hasBadge && (
              <span
                className={cn(
                  "flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold rounded-full",
                  badgeClass,
                )}
              >
                {item.badge}
              </span>
            )}
            {hasBadgeText && (
              <span className="flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-accent/20 text-accent">
                {item.badgeText}
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  const handleAsideClick = (e: React.MouseEvent) => {
    if (!isCollapsed) return;
    const target = e.target as HTMLElement;
    // Don't toggle if clicking an interactive element (nav links, profile button, menu)
    const interactive = target.closest(
      "a, button, [role='button'], input, [role='dialog'], [role='tooltip']",
    );
    if (!interactive) {
      handleToggle();
    }
  };

  return (
    <aside
      onClick={handleAsideClick}
      className={cn(
        "relative flex flex-col h-full bg-primary border-r border-white/10",
        "transition-[width] duration-300 ease-in-out z-30",
        isCollapsed ? "w-19 cursor-pointer" : "w-64",
        className,
      )}
    >
      {/* Brand header */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-white/10 shrink-0",
          isCollapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            <Image
              src="/aims-logo-white.svg"
              alt="AIMS"
              width={28}
              height={28}
              className="w-7 h-7 object-contain"
              priority
            />
          </button>
        ) : (
          <Link
            href={
              userRole === "superadmin"
                ? "/platform"
                : userRole === "borrower"
                  ? "/borrower-db/dashboard"
                  : "/dashboard"
            }
            className="flex items-center gap-2 overflow-hidden select-none"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0">
              <Image
                src="/aims-logo-white.svg"
                alt="AIMS"
                width={28}
                height={28}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span className="text-lg font-bold letter-spacing-wide tracking-wider text-white whitespace-nowrap">
              <span className={cn("text-accent tracking-widest", kronaOne.className)}>AIMS</span>
            </span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 px-3 py-3 space-y-3 overflow-y-auto min-h-0 no-scrollbar",
          isCollapsed ? "overflow-x-visible" : "overflow-x-hidden",
        )}
      >
        {sections.map((section, index) => (
          <div key={section.label}>
            {!isCollapsed ? (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {section.label}
              </p>
            ) : (
              index > 0 && <div className="h-px bg-white/10 my-2 mx-1" />
            )}
            <div className="space-y-0.5">{section.items.map(renderNavItem)}</div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div
        className="relative border-t border-white/10 p-3 shrink-0"
        ref={userMenuRef}
      >
        <div className="flex items-center justify-between w-full gap-1">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className={cn(
              "flex flex-1 items-center rounded-lg transition-colors cursor-pointer min-w-0",
              isCollapsed
                ? "justify-center p-2"
                : "gap-3 p-2 text-left hover:bg-white/6",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
              userMenuOpen && "bg-white/10",
            )}
            title={isCollapsed ? userName : undefined}
            aria-expanded={userMenuOpen}
            aria-haspopup="dialog"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white shrink-0">
              <User className="w-4.5 h-4.5" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-status-active-bg ring-2 ring-primary" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-white/40 truncate">{userEmail}</p>
              </div>
            )}
          </button>

          {!isCollapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className={cn(
                "hidden md:flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors",
                "w-8 h-8 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
              )}
            >
              <PanelLeftClose className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: isCollapsed ? 0 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: isCollapsed ? 0 : 6 }}
              transition={{ duration: 0.14 }}
              className={cn(
                "rounded-xl border border-white/15 bg-[#2a3260] p-2 z-50",
                isCollapsed
                  ? "absolute left-full bottom-3 ml-3 w-64 shadow-none"
                  : "absolute bottom-full left-3 right-3 mb-3.5 shadow-[0_0_12px_rgba(0,0,0,0.25)]",
              )}
            >
              {/* User Identity Header */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 mb-1.5">
                <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white shrink-0">
                  <User className="w-4.5 h-4.5" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-status-active-bg ring-2 ring-[#2a3260]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-white/50 truncate">{userEmail}</p>
                  {userRole && (
                    <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                      {userRole}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/10 my-1" />

              {/* Action buttons */}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={handleNavigateProfile}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer group"
                >
                  <Settings className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                  <span className="font-medium">Profile & Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <LogOut className="w-4 h-4 text-red-400/80 group-hover:text-red-300 transition-colors" />
                  <span className="font-medium">
                    {isLoggingOut ? "Signing out..." : "Log out"}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
