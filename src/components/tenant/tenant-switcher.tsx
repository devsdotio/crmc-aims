"use client";

import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

interface TenantSwitcherProps {
  isSidebar?: boolean;
  isCollapsed?: boolean;
}

export function TenantSwitcher({ isSidebar = false, isCollapsed = false }: TenantSwitcherProps) {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadTenants() {
      try {
        const res = await fetch("/api/platform/tenants");
        if (res.ok) {
          const json = await res.json();
          const list = json.data as Tenant[];
          setTenants(list);
          // Read cookie or match default
          const cookieMatch = document.cookie.match(/aims_tenant=([^;]+)/);
          const currentId = cookieMatch ? cookieMatch[1] : list[0]?.id;
          if (currentId) setActiveTenantId(currentId);
        }
      } catch (err) {
        console.error("Failed to fetch tenants:", err);
      }
    }
    void loadTenants();
  }, []);

  const activeTenant = tenants.find((t) => t.id === activeTenantId) || tenants[0];

  const handleSelect = async (tenantId: string) => {
    if (tenantId === activeTenantId) {
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/platform/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantIdOrSlug: tenantId }),
      });
      if (res.ok) {
        setActiveTenantId(tenantId);
        setIsOpen(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to switch tenant:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!tenants.length) return null;

  return (
    <div className={`relative inline-block text-left select-none ${isSidebar && isCollapsed ? "w-full flex justify-center" : ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isLoading}
        className={`flex items-center gap-2 rounded-lg transition-colors cursor-pointer ${
          isSidebar
            ? isCollapsed
              ? "justify-center w-10 h-10 hover:bg-white/10 active:scale-95 transition-all text-white/70"
              : "px-3 py-2 w-full mt-2 text-xs font-semibold text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 shadow-inner"
            : "px-3 py-1.5 text-xs font-semibold text-text bg-bg-subtle hover:bg-neutral-200/70 border border-[#E3E5EC]"
        }`}
        aria-label="Switch institutional workspace"
      >
        <Building2 className={isSidebar ? (isCollapsed ? "w-5 h-5" : "w-4 h-4 shrink-0 text-accent") : "w-3.5 h-3.5 text-[#2A3260]"} />
        {(!isSidebar || !isCollapsed) && (
          <>
            <span className={`max-w-35 truncate flex-1 text-left ${isSidebar ? "text-white" : ""}`}>{activeTenant?.name ?? "CRMC"}</span>
            <ChevronsUpDown className={`w-3 h-3 ${isSidebar ? "text-white/50" : "text-text-secondary"}`} />
          </>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute ${isSidebar ? (isCollapsed ? "left-full ml-2 top-0" : "left-0 mt-1.5") : "right-0 mt-1.5"} w-64 rounded-xl bg-white border border-[#E3E5EC] shadow-xl py-1 z-40`}>
            <div className="px-3 py-1.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider border-b border-[#E3E5EC]">
              Institutions / Tenants
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {tenants.map((t) => {
                const isSelected = t.id === activeTenant?.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void handleSelect(t.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-bg-subtle transition-colors cursor-pointer ${
                      isSelected ? "font-semibold text-[#2A3260]" : "text-text"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{t.name}</span>
                      <span className="text-[10px] text-text-secondary font-mono">{t.slug}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#2A3260] shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-[#E3E5EC] pt-1">
              <Link
                href="/platform/tenants"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#2A3260] hover:bg-bg-subtle transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage Institutions</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
