"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { TenantOnboardingModal } from "@/components/tenant/tenant-onboarding-modal";

interface Tenant {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export default function PlatformTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const fetchTenants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/tenants");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access restricted to platform superadministrators.");
        }
        throw new Error("Failed to load institutions.");
      }
      const json = await res.json();
      const list = json.data as Tenant[];
      setTenants(list);

      const cookieMatch = document.cookie.match(/aims_tenant=([^;]+)/);
      const currentId = cookieMatch ? cookieMatch[1] : list[0]?.id;
      if (currentId) setActiveTenantId(currentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading tenants.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchTenants();
  }, []);

  // Handle success from the onboarding modal
  const handleOnboardingSuccess = async (tenantId: string) => {
    await fetchTenants();
  };

  const handleSwitchTenant = async (tenantId: string) => {
    setSwitchingId(tenantId);
    try {
      const res = await fetch("/api/platform/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantIdOrSlug: tenantId }),
      });
      if (res.ok) {
        setActiveTenantId(tenantId);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to switch tenant:", err);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-subtle">
      {/* Header */}
      <div className="p-6 bg-white border-b border-[#E3E5EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#2A3260]/10 text-[#2A3260]">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-text">
              Platform Institution & Tenant Management
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Provision, monitor, and isolate multi-institutional college workspaces
          </p>
        </div>

        <button
          onClick={() => setIsOnboardingModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2A3260] hover:bg-[#1E2548] rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Institution</span>
        </button>
      </div>

      {/* Main Scoped Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : isLoading ? (
          <div className="h-48 flex items-center justify-center text-text-secondary gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#2A3260]" />
            <span className="text-sm">Loading registered institutions...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => {
              const isActive = tenant.id === activeTenantId;
              const isSwitching = switchingId === tenant.id;

              return (
                <div
                  key={tenant.id}
                  className={`flex flex-col justify-between p-5 bg-white rounded-lg border transition-shadow ${
                    isActive
                      ? "border-[#2A3260] ring-1 ring-[#2A3260] shadow-sm"
                      : "border-[#E3E5EC] hover:shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#2A3260]/10 flex items-center justify-center text-[#2A3260]">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-text truncate max-w-45">
                            {tenant.name}
                          </h3>
                          <span className="inline-block text-[11px] font-mono text-text-secondary bg-bg-subtle px-1.5 py-0.5 rounded">
                            {tenant.slug}
                          </span>
                        </div>
                      </div>

                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E3E5EC] space-y-1 text-xs text-text-secondary">
                      <div className="flex justify-between">
                        <span>Tenant ID:</span>
                        <span className="font-mono text-[10px] truncate max-w-37.5" title={tenant.id}>
                          {tenant.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E3E5EC]">
                    {isActive ? (
                      <button
                        disabled
                        className="w-full py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg cursor-default text-center"
                      >
                        Current Active Workspace
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleSwitchTenant(tenant.id)}
                        disabled={isSwitching}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-[#2A3260] bg-bg-subtle hover:bg-neutral-200/70 rounded-lg transition-colors cursor-pointer"
                      >
                        {isSwitching ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>Switch to Workspace</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-Step Onboarding Modal */}
      <TenantOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onSuccess={handleOnboardingSuccess}
        onSwitchWorkspace={(tenantId) => handleSwitchTenant(tenantId)}
      />
    </div>
  );
}
