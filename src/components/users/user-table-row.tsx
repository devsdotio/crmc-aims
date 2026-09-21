"use client";

import { Edit3, UserX, ShieldAlert, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserAccount } from "@/types/users";
import { RoleBadge } from "./role-badge";

export interface UserTableRowProps {
  user: UserAccount;
  currentUserId: string;
  reactivating?: boolean;
  onSelect: (user: UserAccount) => void;
  onEdit: (user: UserAccount) => void;
  onDeactivate: (user: UserAccount) => void;
  onReactivate: (user: UserAccount) => void;
}

export function UserTableRow({
  user,
  currentUserId,
  reactivating = false,
  onSelect,
  onEdit,
  onDeactivate,
  onReactivate,
}: UserTableRowProps) {
  const isSelf = user.id === currentUserId;

  return (
    <tr
      onClick={() => onSelect(user)}
      tabIndex={0}
      role="row"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(user);
        }
      }}
      className={cn(
        "group border-b border-border bg-bg transition-colors duration-100 cursor-pointer",
        "hover:bg-bg-subtle/80 focus:outline-none focus-visible:bg-bg-subtle",
        user.status === "deactivated" && "opacity-80"
      )}
    >
      <td className="px-5 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text group-hover:text-accent transition-colors block">
            {user.name}
          </span>
          {isSelf && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-0.5 rounded-full border border-accent/20">
              You
            </span>
          )}
        </div>
        <span className="text-xs text-text-secondary block">
          {user.department || (user.role === "borrower" ? "No department linked" : "—")}
        </span>
      </td>

      <td className="px-3 py-3.5 text-xs font-mono text-text-secondary whitespace-nowrap">
        {user.email}
      </td>

      <td className="px-3 py-3.5 whitespace-nowrap">
        <RoleBadge role={user.role} />
      </td>

      <td className="px-3 py-3.5 whitespace-nowrap">
        {user.status === "active" ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-active-bg/20 text-status-active-text">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-retired-bg/20 text-status-retired-text">
            Deactivated
          </span>
        )}
      </td>

      <td className="px-3 py-3.5 text-xs text-text-secondary whitespace-nowrap hidden md:table-cell">
        {user.lastActive}
      </td>

      <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(user)}
            disabled={isSelf}
            aria-label={`Edit profile for ${user.name}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-xs font-semibold text-text-secondary hover:text-text hover:border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {user.status === "active" ? (
            isSelf ? (
              <button
                type="button"
                disabled
                title="You cannot deactivate your own active logged-in account"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/40 bg-bg-subtle text-xs font-semibold text-text-secondary/40 cursor-not-allowed opacity-60"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Deactivate</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onDeactivate(user)}
                aria-label={`Deactivate account for ${user.name}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-xs font-semibold text-text-secondary hover:border-status-retired-bg hover:text-status-retired-text transition-colors cursor-pointer"
              >
                <UserX className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Deactivate</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => onReactivate(user)}
              disabled={reactivating}
              aria-label={`Reactivate account for ${user.name}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-xs font-semibold text-status-active-text hover:border-status-active-text transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reactivating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {reactivating ? "Reactivating…" : "Reactivate"}
              </span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
