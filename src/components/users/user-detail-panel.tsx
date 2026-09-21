"use client";

import { useEffect, useRef } from "react";
import {
  X,
  Edit3,
  UserX,
  UserCheck,
  Mail,
  Building2,
  Calendar,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserAccount } from "@/types/users";
import { ROLE_DEFINITIONS } from "@/constants/roles";
import { RoleBadge } from "./role-badge";

export interface UserDetailPanelProps {
  user: UserAccount | null;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (user: UserAccount) => void;
  onDeactivate: (user: UserAccount) => void;
  onReactivate: (user: UserAccount) => void;
}

export function UserDetailPanel({
  user,
  currentUserId,
  isOpen,
  onClose,
  onEdit,
  onDeactivate,
  onReactivate,
}: UserDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const roleDef = ROLE_DEFINITIONS[user.role];
  const isSelf = user.id === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-heading"
        className={cn(
          "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
          "animate-in slide-in-from-right duration-250 ease-in-out"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="user-detail-heading" className="text-lg font-bold tracking-tight text-text">
                {user.name}
              </h2>
              <RoleBadge role={user.role} />
              {user.status === "active" ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-active-bg/20 text-status-active-text">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-retired-bg/20 text-status-retired-text">
                  Deactivated
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary font-medium mt-0.5 truncate font-mono">
              {user.email} {user.department && `• ${user.department}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onEdit(user)}
              disabled={isSelf}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-text hover:border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Account
            </button>

            {user.status === "active" ? (
              !isSelf ? (
                <button
                  type="button"
                  onClick={() => onDeactivate(user)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-text-secondary hover:border-status-retired-bg hover:text-status-retired-text transition-colors cursor-pointer"
                >
                  <UserX className="h-3.5 w-3.5" />
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="You cannot deactivate your own logged-in account"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border/40 bg-bg-subtle text-text-secondary/40 cursor-not-allowed opacity-60"
                >
                  <UserX className="h-3.5 w-3.5" />
                  Self-Protected
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => onReactivate(user)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-bg text-status-active-text hover:border-status-active-text transition-colors cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Reactivate
              </button>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Assigned Role & System Access Boundary
            </h3>
            <div className="p-4 rounded-xl border border-border bg-bg-subtle space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-text">{roleDef.title} Role</span>
                <RoleBadge role={user.role} showIcon={false} />
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {roleDef.description}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Account Profile Details
            </h3>
            <div className="p-4 rounded-lg border border-border bg-bg space-y-3 text-xs">
              <div className="flex items-center gap-2 text-text">
                <Mail className="h-4 w-4 text-text-secondary shrink-0" />
                <span className="font-mono">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>{user.department || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary pt-2 border-t border-border">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  Account Created:{" "}
                  <strong className="text-text">{user.dateAdded}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Activity className="h-4 w-4 shrink-0" />
                <span>
                  Last Active:{" "}
                  <strong className="text-text">{user.lastActive}</strong>
                </span>
              </div>
            </div>
          </div>

          {user.activitySummary && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Account Note
              </h3>
              <div className="p-3.5 rounded-lg border border-border bg-bg-subtle text-xs text-text font-medium leading-relaxed">
                {user.activitySummary}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
