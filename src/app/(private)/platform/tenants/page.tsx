"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { TenantOnboardingModal } from "@/components/tenant/tenant-onboarding-modal";

interface Tenant {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading tenants.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchTenants();
  }, []);

  const handleOnboardingSuccess = async () => {
    await fetchTenants();
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
              Platform Institutions & Multi-Tenant Registry
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Provision, monitor, and govern collegiate tenants across the platform
          </p>
        </div>

        <button
          onClick={() => setIsOnboardingModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2A3260] hover:bg-[#1E2548] rounded-lg transition-colors cursor-pointer shadow-xs"
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
              return (
                <div
                  key={tenant.id}
                  className="flex flex-col justify-between p-5 bg-white rounded-xl border border-[#E3E5EC] shadow-xs hover:border-[#2A3260]/40 transition-colors"
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
                          <span className="inline-block text-[11px] font-mono text-text-secondary bg-bg-subtle px-1.5 py-0.5 rounded border border-[#E3E5EC] mt-0.5">
                            {tenant.slug}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E3E5EC] space-y-1.5 text-xs text-text-secondary">
                      <div className="flex justify-between items-center">
                        <span>Tenant ID:</span>
                        <span
                          className="font-mono text-[10px] text-text truncate max-w-37.5"
                          title={tenant.id}
                        >
                          {tenant.id}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Registered:</span>
                        </span>
                        <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E3E5EC]">
                    <Link
                      href={`/users?institution=${tenant.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#2A3260] bg-neutral-50 hover:bg-[#2A3260] hover:text-white border border-[#E3E5EC] rounded-lg transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>View & Manage Users</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
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
      />
    </div>
  );
}
