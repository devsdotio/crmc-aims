"use client";

import { useState } from "react";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  Key,
  User,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

interface TenantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tenantId: string) => void;
  onSwitchWorkspace?: (tenantId: string) => void;
}

export function TenantOnboardingModal({
  isOpen,
  onClose,
  onSuccess,
  onSwitchWorkspace,
}: TenantOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [seedStarterData, setSeedStarterData] = useState(true);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 10)) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 16)
      );
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminPassword(pass);
  };

  const copyCredentials = async () => {
    const text = `Institution: ${name}
Login URL: https://${slug}.aims.io/sign-in
Admin Email: ${adminEmail}
Admin Password: ${adminPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim() || !slug.trim()) {
        setError("Institution Name and Slug are required.");
        return;
      }
    }
    if (step === 2) {
      if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
        setError("All administrator fields are required.");
        return;
      }
      if (adminPassword.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }
    setStep((s) => (s + 1) as 2 | 3 | 4);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/platform/tenants/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim().toLowerCase(),
          adminPassword,
          seedStarterData,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to onboard institution.");
      }

      setCreatedTenantId(json.data.tenant.id);
      setStep(4);
      onSuccess(json.data.tenant.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E3E5EC] bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2A3260] flex items-center justify-center text-white">
              {step === 4 ? <CheckCircle2 className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-text">
                {step === 4 ? "Institution Provisioned" : "Onboard New Institution"}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {step === 1 && "Step 1: Identity & Routing"}
                {step === 2 && "Step 2: Administrator Account"}
                {step === 3 && "Step 3: Starter Initialization"}
                {step === 4 && "Successfully created new workspace"}
              </p>
            </div>
          </div>
          {step < 4 && (
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-text-secondary hover:text-text rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {step < 4 && (
          <div className="h-1 w-full bg-[#E3E5EC] shrink-0">
            <div
              className="h-full bg-[#2A3260] transition-all duration-300 ease-in-out"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Institution Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Pedro College"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-text bg-white border border-[#E3E5EC] rounded-lg focus:outline-hidden focus:border-[#2A3260]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Workspace Slug (Subdomain)
                </label>
                <div className="flex rounded-lg border border-[#E3E5EC] overflow-hidden focus-within:border-[#2A3260] bg-bg-subtle">
                  <span className="px-3 py-2 text-sm text-text-secondary border-r border-[#E3E5EC] font-mono">
                    https://
                  </span>
                  <input
                    type="text"
                    placeholder="spc"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    className="flex-1 px-3 py-2 text-sm font-mono text-text bg-white focus:outline-hidden"
                  />
                  <span className="px-3 py-2 text-sm text-text-secondary border-l border-[#E3E5EC] font-mono">
                    .aims.io
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5">
                  This short, unique identifier will be used for the institution&apos;s URL and internal routing.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Administrator Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="e.g. System Admin"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm text-text bg-white border border-[#E3E5EC] rounded-lg focus:outline-hidden focus:border-[#2A3260]"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Administrator Email
                </label>
                <input
                  type="email"
                  placeholder="admin@institution.edu"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-text bg-white border border-[#E3E5EC] rounded-lg focus:outline-hidden focus:border-[#2A3260]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Initial Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Minimum 8 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm text-text bg-white border border-[#E3E5EC] rounded-lg focus:outline-hidden focus:border-[#2A3260]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 text-xs font-semibold text-[#2A3260] bg-bg-subtle border border-[#E3E5EC] hover:bg-neutral-200 rounded-lg cursor-pointer shrink-0"
                  >
                    Auto-Generate
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-4 rounded-xl border border-[#E3E5EC] bg-bg-subtle space-y-4">
                <div className="flex items-start gap-3">
                  <Settings2 className="w-5 h-5 text-[#2A3260] mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-text">Workspace Initialization</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Choose how the institutional database should be initialized upon creation.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3 bg-white border border-[#E3E5EC] rounded-lg cursor-pointer hover:border-[#2A3260] transition-colors">
                  <input
                    type="checkbox"
                    checked={seedStarterData}
                    onChange={(e) => setSeedStarterData(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#2A3260] border-[#E3E5EC] rounded focus:ring-[#2A3260]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-text">Seed Baseline Master Data</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Automatically creates standard defaults (e.g. General Admin department, standard IT and office supply categories) to make the workspace instantly usable.
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Ready to Provision
                </h3>
                <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                  You are about to securely provision a new institution space for <strong>{name}</strong>. A dedicated tenant database schema and isolation policies will be created.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-text">Provisioning Complete!</h3>
                <p className="text-sm text-text-secondary mt-1">
                  The {name} workspace has been fully isolated and initialized.
                </p>
              </div>

              <div className="p-4 bg-neutral-900 rounded-xl relative group">
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={copyCredentials}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <h4 className="text-xs font-mono text-neutral-400 mb-3 uppercase tracking-wider">
                  Admin Credentials
                </h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex gap-4">
                    <span className="text-neutral-500 w-20">URL:</span>
                    <span className="text-emerald-400">https://{slug}.aims.io/sign-in</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-neutral-500 w-20">Email:</span>
                    <span className="text-white">{adminEmail}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-neutral-500 w-20">Password:</span>
                    <span className="text-white">{adminPassword}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-[#E3E5EC] bg-white flex items-center justify-between shrink-0">
          {step < 4 ? (
            <>
              <button
                type="button"
                onClick={step === 1 ? onClose : handleBack}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>

              <button
                type="button"
                onClick={step === 3 ? handleSubmit : handleNext}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2A3260] hover:bg-[#1E2548] rounded-lg transition-colors cursor-pointer disabled:opacity-70 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <span>{step === 3 ? "Provision Tenant" : "Continue"}</span>
                    {step < 3 && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-lg cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (typeof window !== "undefined" && createdTenantId) {
                    window.location.href = `/users?institution=${createdTenantId}`;
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2A3260] hover:bg-[#1E2548] rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <span>View Institution Users</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
