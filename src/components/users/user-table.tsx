"use client";

import { Users } from "lucide-react";
import type { UserAccount } from "@/types/users";
import { UserTableRow } from "./user-table-row";

export interface UserTableProps {
  users: UserAccount[];
  currentUserId: string;
  loading?: boolean;
  reactivatingUserId?: string | null;
  onSelect: (user: UserAccount) => void;
  onEdit: (user: UserAccount) => void;
  onDeactivate: (user: UserAccount) => void;
  onReactivate: (user: UserAccount) => void;
}

function SkeletonTableRow() {
  return (
    <tr className="border-b border-border bg-bg animate-pulse">
      <td className="px-5 py-4">
        <div className="h-4 w-36 bg-border rounded mb-1" />
        <div className="h-3 w-24 bg-border rounded" />
      </td>
      <td className="px-3 py-4">
        <div className="h-4 w-44 bg-border rounded" />
      </td>
      <td className="px-3 py-4">
        <div className="h-5 w-20 bg-border rounded-full" />
      </td>
      <td className="px-3 py-4">
        <div className="h-5 w-16 bg-border rounded-full" />
      </td>
      <td className="px-3 py-4 hidden md:table-cell">
        <div className="h-3.5 w-24 bg-border rounded" />
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-7 w-14 bg-border rounded" />
          <div className="h-7 w-20 bg-border rounded" />
        </div>
      </td>
    </tr>
  );
}

export function UserTable({
  users,
  currentUserId,
  loading = false,
  reactivatingUserId = null,
  onSelect,
  onEdit,
  onDeactivate,
  onReactivate,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Staff accounts loading table">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              <th scope="col" className="px-5 py-3">Name & Department</th>
              <th scope="col" className="px-3 py-3">Email Address</th>
              <th scope="col" className="px-3 py-3">System Role</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3 hidden md:table-cell">Last Active</th>
              <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 border border-accent/25 text-accent shadow-xs">
          <Users className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="text-base font-bold text-text">No user accounts found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
            No institutional user or custodian accounts match your current search query, role filter, or status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" aria-label="Staff accounts & access levels table">
        <thead>
          <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary sticky top-0 z-10 shadow-2xs">
            <th scope="col" className="px-5 py-3">Name & Department</th>
            <th scope="col" className="px-3 py-3">Email Address</th>
            <th scope="col" className="px-3 py-3">System Role</th>
            <th scope="col" className="px-3 py-3">Status</th>
            <th scope="col" className="px-3 py-3 hidden md:table-cell">Last Active</th>
            <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              reactivating={reactivatingUserId === user.id}
              onSelect={onSelect}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
