"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Edit, AlertTriangle, Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserAccount, UserRole, UserStatus } from "@/types/users";
import { ROLE_DEFINITIONS, INVITABLE_ROLES } from "@/constants/roles";
import type { DepartmentDTO } from "@/features/departments/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

export interface EditUserSaveInput {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  status: UserStatus;
  password?: string;
}

export interface EditUserDialogProps {
  user: UserAccount | null;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: EditUserSaveInput) => void | Promise<void>;
  canInviteAdmin?: boolean;
  departments?: DepartmentDTO[];
}

interface EditUserDialogFormProps {
  user: UserAccount;
  currentUserId: string;
  canInviteAdmin: boolean;
  onClose: () => void;
  onSave: (updated: EditUserSaveInput) => void | Promise<void>;
  departments: DepartmentDTO[];
}

function EditUserDialogForm({
  user,
  currentUserId,
  canInviteAdmin,
  onClose,
  onSave,
  departments,
}: EditUserDialogFormProps) {
  const [name, setName] = useState(() => user.name);
  const email = user.email;
  const [role, setRole] = useState<UserRole>(() => user.role);
  const [departmentId, setDepartmentId] = useState(() => user.departmentId ?? "");
  const [status, setStatus] = useState<UserStatus>(() => user.status);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
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

  const isSelf = user.id === currentUserId;
  const isSelfDemotion =
    isSelf &&
    (user.role === "admin" || user.role === "superadmin") &&
    role !== user.role;

  const isDepartmentAccount = role === "borrower";
  const availableDepartments = useMemo(
    () =>
      departments.filter(
        (d) => !d.accountUserId || d.id === user.departmentId
      ),
    [departments, user.departmentId]
  );

  const departmentOptions = useMemo(
    () =>
      availableDepartments.map((dept) => ({
        value: dept.id,
        label: `${dept.name} (${dept.code})`,
        keywords: dept.code,
      })),
    [availableDepartments]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a display name.");
      return;
    }
    if (isDepartmentAccount && !departmentId) {
      setError("Select a department for this login.");
      return;
    }
    if (password || confirmPassword) {
      if (password.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSave({
        id: user.id,
        name: name.trim(),
        email: user.email,
        role,
        departmentId: isDepartmentAccount ? departmentId : null,
        status,
        ...(password ? { password } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-dialog-title"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 my-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <h3 id="edit-dialog-title" className="text-base font-bold text-text leading-tight">
                Edit User Account
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit dialog"
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit-name-input" className="block text-xs font-semibold text-text">
                Full Name <span className="text-accent">*</span>
              </label>
              <input
                id="edit-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-email-input" className="block text-xs font-semibold text-text">
                Login Email
              </label>
              <input
                id="edit-email-input"
                type="email"
                value={email}
                readOnly
                title="Email cannot be changed after the account is created"
                className="w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text-secondary font-mono cursor-not-allowed"
              />
              <p className="text-[10px] text-text-secondary">Login email cannot be changed here.</p>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-dept-select" className="block text-xs font-semibold text-text">
              Department {isDepartmentAccount && <span className="text-accent">*</span>}
            </label>
            {isDepartmentAccount ? (
              <SearchableSelect
                id="edit-dept-select"
                value={departmentId}
                onValueChange={(nextId) => {
                  setDepartmentId(nextId);
                  const next = departments.find((d) => d.id === nextId);
                  if (next && (!name.trim() || name === user.department)) {
                    setName(next.name);
                  }
                }}
                options={departmentOptions}
                placeholder="Select a department…"
                clearLabel="Select a department…"
                emptyMessage="No departments available"
                aria-required="true"
              />
            ) : (
              <p className="text-[11px] text-text-secondary pt-1">
                Staff and admin accounts are not tied to a department login.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Account Status
            </label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account status">
              {(
                [
                  { value: "active" as const, label: "Active", hint: "Can sign in" },
                  {
                    value: "deactivated" as const,
                    label: "Deactivated",
                    hint: "Sign-in blocked",
                  },
                ] as const
              ).map((opt) => {
                const selected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isSelf && opt.value === "deactivated"}
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all cursor-pointer outline-none",
                      "focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed",
                      selected
                        ? opt.value === "active"
                          ? "bg-status-active-bg/10 border-status-active-text/40 ring-1 ring-status-active-text/30"
                          : "bg-status-retired-bg/10 border-status-retired-text/40 ring-1 ring-status-retired-text/30"
                        : "bg-bg border-border hover:bg-bg-subtle/60"
                    )}
                  >
                    <span className="text-xs font-bold text-text">{opt.label}</span>
                    <span className="text-[10px] text-text-secondary">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border border-border rounded-xl p-3 bg-bg-subtle/40">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Set New Password
            </label>
            <p className="text-[11px] text-text-secondary -mt-1">
              Leave blank to keep the current password. Share any new password with the user out of band.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="edit-password-input" className="block text-xs font-semibold text-text">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="edit-password-input"
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
                <label htmlFor="edit-confirm-password-input" className="block text-xs font-semibold text-text">
                  Confirm Password
                </label>
                <input
                  id="edit-confirm-password-input"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="new-password"
                  placeholder="Re-enter if changing"
                  className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              System Access Role <span className="text-accent">*</span>
            </label>

            <div className="space-y-2" role="radiogroup" aria-label="System role selection">
              {(INVITABLE_ROLES.filter(
                (rKey) => rKey !== "admin" || canInviteAdmin
              ) as UserRole[]).map((rKey) => {
                const rDef = ROLE_DEFINITIONS[rKey];
                const isSelected = role === rKey;
                return (
                  <button
                    key={rKey}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setRole(rKey)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer outline-none w-full",
                      "focus-visible:ring-2 focus-visible:ring-accent",
                      isSelected
                        ? "bg-bg-subtle border-primary ring-1 ring-primary shadow-2xs"
                        : "bg-bg border-border hover:bg-bg-subtle/60"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border shrink-0",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      )}
                    >
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-text">{rDef.title}</span>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                        {rDef.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {isSelfDemotion && (
            <div className="p-3.5 rounded-xl border border-status-repair-bg/40 bg-status-repair-bg/15 text-status-repair-text text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Self-Demotion Warning</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                You are about to change your own role from <strong>Admin</strong> to <strong>{ROLE_DEFINITIONS[role].title}</strong>. You will immediately lose access to User Management and System Settings upon saving.
              </p>
            </div>
          )}

          {error && <p className="text-xs font-bold text-status-outofservice-text">{error}</p>}

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
              disabled={isSubmitting || isSelf}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed",
                isSelfDemotion
                  ? "bg-status-repair-bg text-status-repair-text hover:opacity-90"
                  : "bg-accent text-accent-foreground hover:opacity-90"
              )}
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {isSubmitting
                ? "Saving…"
                : isSelfDemotion
                  ? "Confirm & Demote Self"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditUserDialog({
  user,
  currentUserId,
  isOpen,
  onClose,
  onSave,
  canInviteAdmin = false,
  departments = [],
}: EditUserDialogProps) {
  if (!isOpen || !user) return null;

  return (
    <EditUserDialogForm
      key={user.id}
      user={user}
      currentUserId={currentUserId}
      canInviteAdmin={canInviteAdmin}
      onClose={onClose}
      onSave={onSave}
      departments={departments}
    />
  );
}
