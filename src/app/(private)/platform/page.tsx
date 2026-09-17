"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Plus,
  ArrowRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  Calendar,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { TenantOnboardingModal } from "@/components/tenant/tenant-onboarding-modal";

interface PlatformInstitution {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  userCount: number;
  admin: {
    fullName: string;
    email: string;
  } | null;
}

interface PlatformMetricsData {
  totalInstitutions: number;
  totalUsers: number;
  roles: {
    superadmin: number;
    admin: number;
    staff: number;
    borrower: number;
  };
  statuses: {
    active: number;
    deactivated: number;
  };
  institutions: PlatformInstitution[];
}

export default function PlatformDashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/metrics");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access restricted to platform superadministrators.");
        }
        throw new Error("Failed to load platform metrics.");
      }
      const json = await res.json();
      setMetrics(json.data as PlatformMetricsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();
  }, []);

  const handleOnboardingSuccess = async () => {
    await fetchMetrics();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-subtle">
      {/* Platform Header */}
      <div className="p-6 bg-white border-b border-[#E3E5EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#2A3260]/10 text-[#2A3260]">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-text">
              Superadmin Platform Overview
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Global governance, institution provisioning, and user management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-text bg-white hover:bg-neutral-50 border border-[#E3E5EC] rounded-lg transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-text-secondary" />
            <span>Manage Users</span>
          </Link>
          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2A3260] hover:bg-[#1E2548] rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Register Institution</span>
          </button>
        </div>
      </div>

      {/* Main Scoped Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-white border border-[#E3E5EC] p-4 flex flex-col justify-between"
                />
              ))}
            </div>
            <div className="h-64 rounded-xl bg-white border border-[#E3E5EC] animate-pulse" />
          </div>
        ) : metrics ? (
          <>
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Institutions */}
              <div className="p-4 bg-white rounded-xl border border-[#E3E5EC] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">
                    Institutions
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#2A3260]/10 flex items-center justify-center text-[#2A3260]">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-text">
                    {metrics.totalInstitutions}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Onboarded collegiate tenants
                  </p>
                </div>
              </div>

              {/* Card 2: Total Users */}
              <div className="p-4 bg-white rounded-xl border border-[#E3E5EC] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">
                    Total Platform Users
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-text">
                    {metrics.totalUsers}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Across all institutions
                  </p>
                </div>
              </div>

              {/* Card 3: Institution Admins */}
              <div className="p-4 bg-white rounded-xl border border-[#E3E5EC] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">
                    Institution Admins
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-text">
                    {metrics.roles.admin}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Tenant workspace managers
                  </p>
                </div>
              </div>

              {/* Card 4: Staff */}
              <div className="p-4 bg-white rounded-xl border border-[#E3E5EC] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">
                    Staff & Custodians
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-text">
                    {metrics.roles.staff}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Operational department staff
                  </p>
                </div>
              </div>

              {/* Card 5: Borrowers/Requesters */}
              <div className="p-4 bg-white rounded-xl border border-[#E3E5EC] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">
                    Department Requesters
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-text">
                    {metrics.roles.borrower}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Department borrower accounts
                  </p>
                </div>
              </div>
            </div>

            {/* Institution Management Section */}
            <div className="bg-white rounded-xl border border-[#E3E5EC] overflow-hidden shadow-xs">
              <div className="p-5 border-b border-[#E3E5EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-text">
                    Registered Institutions & User Adoption
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Overview of onboarded college tenants and active user distribution
                  </p>
                </div>

                <Link
                  href="/platform/tenants"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2A3260] hover:underline"
                >
                  <span>View All Institutions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FA] text-text-secondary border-b border-[#E3E5EC]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Institution Name</th>
                      <th className="px-5 py-3 font-semibold">Slug Identifier</th>
                      <th className="px-5 py-3 font-semibold">Primary Administrator</th>
                      <th className="px-5 py-3 font-semibold">Total Users</th>
                      <th className="px-5 py-3 font-semibold">Date Registered</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E5EC]">
                    {metrics.institutions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-8 text-center text-text-secondary"
                        >
                          No institutions registered yet.
                        </td>
                      </tr>
                    ) : (
                      metrics.institutions.map((inst) => (
                        <tr
                          key={inst.id}
                          className="hover:bg-neutral-50/70 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#2A3260]/10 flex items-center justify-center text-[#2A3260] shrink-0">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-text">
                                {inst.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-[11px] bg-bg-subtle text-text px-2 py-0.5 rounded border border-[#E3E5EC]">
                              {inst.slug}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {inst.admin ? (
                              <div>
                                <div className="font-medium text-text flex items-center gap-1.5">
                                  <UserIcon className="w-3.5 h-3.5 text-text-secondary" />
                                  <span>{inst.admin.fullName}</span>
                                </div>
                                <div className="text-[11px] text-text-secondary flex items-center gap-1.5 mt-0.5">
                                  <Mail className="w-3.5 h-3.5 text-text-secondary" />
                                  <span>{inst.admin.email}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-text-secondary italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px]">
                              <Users className="w-3 h-3" />
                              {inst.userCount} {inst.userCount === 1 ? "user" : "users"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-text-secondary">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(inst.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/users?institution=${inst.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2A3260] bg-neutral-100 hover:bg-[#2A3260] hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                              <span>View Users</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
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
