"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, EyeOff, Eye, Check } from "lucide-react";
import type { UserRole } from "@/types/users";
import type { DepartmentDTO } from "@/features/departments/client";

export interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (input: {
    name: string;
    email: string;
    role: UserRole;
    departmentId?: string;
    tenantId?: string;
    password: string;
  }) => void | Promise<void>;
  departments?: DepartmentDTO[];
  canInviteAdmin?: boolean;
  tenants?: { id: string; name: string }[];
}

/** @deprecated Use CreateUserDialogProps */
export type InviteUserDialogProps = CreateUserDialogProps;

interface CreateUserDialogFormProps {
  onClose: () => void;
  onCreateUser: CreateUserDialogProps["onCreateUser"];
  departments: DepartmentDTO[];
  canInviteAdmin?: boolean;
  tenants?: { id: string; name: string }[];
}

function CreateUserDialogForm({
  onClose,
  onCreateUser,
  departments,
  canInviteAdmin,
  tenants,
}: CreateUserDialogFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("borrower");
  const [departmentId, setDepartmentId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const availableDepartments = departments.filter((d) => !d.accountUserId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "borrower" && !departmentId) {
      setError("Select a department for this login.");
      return;
    }
    if (canInviteAdmin && tenants && tenants.length > 0 && !tenantId) {
      setError("Select an institution for this user.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter the department account display name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid institutional email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onCreateUser({
        name: name.trim(),
        email: email.trim(),
        role,
        departmentId: role === "borrower" ? departmentId : undefined,
        tenantId: canInviteAdmin && tenantId ? tenantId : undefined,
        password,
      });
      setSuccessMessage(`Account created for ${email.trim()}`);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div className="absolute inset-0" onClick={isSubmitting ? undefined : onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-dialog-title"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 my-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 id="create-user-dialog-title" className="text-base font-bold text-text leading-tight">
                Create Account
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {canInviteAdmin ? "Add a new user to an institution" : "Department login (email + password) for one office"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close create user dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="create-name-input" className="block text-xs font-semibold text-text">
                Full Name <span className="text-accent">*</span>
              </label>
              <input
                id="create-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Defaults to the department name"
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="create-email-input" className="block text-xs font-semibold text-text">
                Institutional Email <span className="text-accent">*</span>
              </label>
              <input
                id="create-email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. m.santos@crmc.edu.ph"
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
            </div>
          </div>

          {canInviteAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="create-role-select" className="block text-xs font-semibold text-text">
                  Role <span className="text-accent">*</span>
                </label>
                <select
                  id="create-role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="borrower">Department account</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {tenants && tenants.length > 0 && (
                <div className="space-y-1">
                  <label htmlFor="create-tenant-select" className="block text-xs font-semibold text-text">
                    Institution <span className="text-accent">*</span>
                  </label>
                  <select
                    id="create-tenant-select"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Select an institution…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {role === "borrower" && (
            <div className="space-y-1">
            <label htmlFor="create-dept-select" className="block text-xs font-semibold text-text">
              Department <span className="text-accent">*</span>
            </label>
            <select
              id="create-dept-select"
              value={departmentId}
              onChange={(e) => {
                const nextId = e.target.value;
                setDepartmentId(nextId);
                const next = departments.find((d) => d.id === nextId);
                if (next) setName(next.name);
                if (error) setError("");
              }}
              className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select a department…</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
            {availableDepartments.length === 0 && (
              <p className="text-[11px] text-text-secondary">
                Every department already has a login, or none exist yet. Add
                a department in Settings first.
              </p>
            )}
          </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="create-password-input" className="block text-xs font-semibold text-text">
                Initial Password <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <input
                  id="create-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full h-9 px-3 pr-9 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="create-confirm-password-input" className="block text-xs font-semibold text-text">
                Confirm Password <span className="text-accent">*</span>
              </label>
              <input
                id="create-confirm-password-input"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="new-password"
                placeholder="Re-enter password"
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {error && <p className="text-xs font-bold text-status-outofservice-text">{error}</p>}
          {successMessage && (
            <div className="p-2.5 rounded bg-status-active-bg/20 border border-status-active-bg/30 text-status-active-text font-bold text-xs flex items-center gap-1.5">
              <Check className="h-4 w-4 shrink-0" />
              {successMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text rounded-md border border-border bg-bg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isSubmitting ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateUserDialog({
  isOpen,
  onClose,
  onCreateUser,
  departments = [],
  canInviteAdmin,
  tenants,
}: CreateUserDialogProps) {
  if (!isOpen) return null;

  return (
    <CreateUserDialogForm
      key="create-user"
      onClose={onClose}
      onCreateUser={onCreateUser}
      departments={departments}
      canInviteAdmin={canInviteAdmin}
      tenants={tenants}
    />
  );
}

/** Back-compat alias while callers migrate names. */
export const InviteUserDialog = CreateUserDialog;
