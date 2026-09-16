"use client";

import { useState, useMemo, useEffect } from "react";
import { UserPlus, AlertCircle, Users, UserCheck, Building2, Shield } from "lucide-react";
import type { UserAccount, UserFilterState, UserRole } from "@/types/users";

import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { UserFilters } from "@/components/users/user-filters";
import { UserTable } from "@/components/users/user-table";
import { UserDetailPanel } from "@/components/users/user-detail-panel";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import {
  EditUserDialog,
  type EditUserSaveInput,
} from "@/components/users/edit-user-dialog";
import { DeactivateUserDialog } from "@/components/users/deactivate-user-dialog";
import {
  useCreateUserMutation,
  useDeactivateUserMutation,
  useMeQuery,
  useReactivateUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from "@/features/users/client";
import { useToast } from "@/components/providers/toast-context";
import { useDepartmentsQuery } from "@/features/departments/client";

export default function UsersPage() {
  const { data: me, error: meError } = useMeQuery();
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
    isFetching,
  } = useUsersQuery();

  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const deactivateUser = useDeactivateUserMutation();
  const reactivateUser = useReactivateUserMutation();
  const toast = useToast();
  const { data: departments = [] } = useDepartmentsQuery();

  const currentUserId = me?.id ?? "";
  const canInviteAdmin = me?.role === "superadmin";
  // Table only waits on users list; me gates invite only.
  const isLoading = usersLoading;

  const [filters, setFilters] = useState<UserFilterState>({
    searchQuery: "",
    role: "all",
    status: "all",
  });

  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogUser, setEditDialogUser] = useState<UserAccount | null>(null);
  const [deactivateDialogUser, setDeactivateDialogUser] =
    useState<UserAccount | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filters.searchQuery?.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchName = u.name.toLowerCase().includes(query);
        const matchEmail = u.email.toLowerCase().includes(query);
        if (!matchName && !matchEmail) return false;
      }

      if (filters.role && filters.role !== "all" && u.role !== filters.role) {
        return false;
      }

      if (filters.status && filters.status !== "all" && u.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [users, filters]);

  const totalUsersCount = users.length;
  const activeUsersCount = useMemo(
    () => users.filter((u) => u.status === "active").length,
    [users],
  );
  const departmentLoginsCount = useMemo(
    () => users.filter((u) => u.role === "borrower").length,
    [users],
  );
  const adminStaffCount = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === "admin" ||
          u.role === "superadmin" ||
          u.role === "staff",
      ).length,
    [users],
  );

  const selectedSynced = useMemo(() => {
    if (!selectedUser) return null;
    return users.find((u) => u.id === selectedUser.id) ?? selectedUser;
  }, [users, selectedUser]);

  const handleFilterChange = (updated: Partial<UserFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      role: "all",
      status: "all",
    });
  };

  const handleCreateUser = async (input: {
    name: string;
    email: string;
    role: UserRole;
    departmentId?: string;
    password: string;
  }) => {
    setPageError(null);
    if (input.role === "superadmin") {
      throw new Error("Superadmin accounts can only be created via seed script.");
    }
    try {
      await createUser.mutateAsync({
        name: input.name,
        email: input.email,
        role: input.role,
        departmentId: input.departmentId,
        password: input.password,
      });
      toast.success("Account created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user.");
      throw err;
    }
  };

  const handleSaveUser = async (input: EditUserSaveInput) => {
    setPageError(null);
    if (input.role === "superadmin") {
      throw new Error("Cannot assign superadmin via this form.");
    }
    try {
      const saved = await updateUser.mutateAsync({
        id: input.id,
        payload: {
          name: input.name,
          role: input.role,
          departmentId: input.role === "borrower" ? input.departmentId : null,
          status: input.status,
          ...(input.password ? { password: input.password } : {}),
        },
      });
      setSelectedUser((prev) => (prev?.id === saved.id ? saved : prev));
      toast.success("User account updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user.");
      throw err;
    }
  };

  const handleConfirmDeactivate = async (userToDeactivate: UserAccount) => {
    setPageError(null);
    if (userToDeactivate.id === currentUserId) {
      throw new Error("You cannot deactivate your own account.");
    }
    try {
      const saved = await deactivateUser.mutateAsync(userToDeactivate.id);
      setSelectedUser((prev) => (prev?.id === saved.id ? saved : prev));
      toast.success("Account deactivated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate account.");
      throw err;
    }
  };

  const handleReactivate = async (userToReactivate: UserAccount) => {
    setPageError(null);
    try {
      const saved = await reactivateUser.mutateAsync(userToReactivate.id);
      setSelectedUser((prev) => (prev?.id === saved.id ? saved : prev));
      toast.success("Account reactivated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reactivate account.");
    }
  };

  const loadError =
    meError?.message ||
    usersError?.message ||
    pageError ||
    (me && me.role !== "superadmin" && me.role !== "admin"
      ? "Only admins can manage user accounts."
      : null);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md" data-theme="light">
      <div className="px-4 md:px-6 pt-5 pb-3 bg-bg shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text">
              Users & Department Accounts
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
              {isLoading
                ? "Loading accounts…"
                : `${filteredUsers.length} of ${users.length} accounts`}
              {isFetching && !isLoading ? " · updating…" : ""}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Set passwords and department logins. Create departments in Settings first, then attach one login per department.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setInviteDialogOpen(true)}
            disabled={Boolean(loadError) || !me}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="h-4 w-4" strokeWidth={2.5} />
            Create User
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-4 pb-1 shrink-0 bg-bg">
        <StatCardGrid>
          <StatCard
            title="Total Accounts"
            sublabel="DIRECTORY // USERS"
            value={totalUsersCount}
            icon={Users}
            tone="blue"
            badge={{ text: "Directory", pulse: true }}
            subtitle="Registered accounts across institution"
            loading={isLoading}
          />

          <StatCard
            title="Active Users"
            sublabel="SECURITY // STATUS"
            value={activeUsersCount}
            icon={UserCheck}
            tone="emerald"
            toneValue={true}
            badge={
              totalUsersCount > 0
                ? `${Math.round((activeUsersCount / totalUsersCount) * 100)}% active`
                : "0%"
            }
            subtitle="Verified credentials enabled to sign in"
            progress={{
              value: activeUsersCount,
              max: totalUsersCount || 1,
            }}
            loading={isLoading}
          />

          <StatCard
            title="Department Logins"
            sublabel="OFFICE // ACCESS"
            value={departmentLoginsCount}
            icon={Building2}
            tone="purple"
            toneValue={true}
            badge="Borrowers"
            subtitle="Designated accounts assigned to offices"
            loading={isLoading}
          />

          <StatCard
            title="Admin & Staff"
            sublabel="PRIVILEGE // ROLES"
            value={adminStaffCount}
            icon={Shield}
            tone="amber"
            toneValue={true}
            badge="Elevated"
            subtitle="Managers & custodians with operation rights"
            loading={isLoading}
          />
        </StatCardGrid>
      </div>

      {loadError && (
        <div className="mx-4 md:mx-6 mt-3 flex items-start gap-2 rounded-lg border border-status-outofservice-bg/40 bg-status-outofservice-bg/10 px-3 py-2 text-xs text-status-outofservice-text">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      <UserFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        totalUsersCount={users.length}
      />

      <main className="flex-1 overflow-y-auto min-h-0 bg-bg">
        <UserTable
          users={filteredUsers}
          currentUserId={currentUserId}
          loading={isLoading && !usersError}
          reactivatingUserId={
            reactivateUser.isPending ? reactivateUser.variables : null
          }
          onSelect={setSelectedUser}
          onEdit={setEditDialogUser}
          onDeactivate={setDeactivateDialogUser}
          onReactivate={handleReactivate}
        />
      </main>

      <UserDetailPanel
        user={selectedSynced}
        currentUserId={currentUserId}
        isOpen={Boolean(selectedSynced)}
        onClose={() => setSelectedUser(null)}
        onEdit={(u) => {
          setSelectedUser(null);
          setEditDialogUser(u);
        }}
        onDeactivate={(u) => {
          setSelectedUser(null);
          setDeactivateDialogUser(u);
        }}
        onReactivate={(u) => {
          void handleReactivate(u);
        }}
      />

      <InviteUserDialog
        isOpen={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onCreateUser={handleCreateUser}
        departments={departments}
      />

      <EditUserDialog
        user={editDialogUser}
        currentUserId={currentUserId}
        isOpen={Boolean(editDialogUser)}
        onClose={() => setEditDialogUser(null)}
        onSave={handleSaveUser}
        canInviteAdmin={canInviteAdmin}
        departments={departments}
      />

      <DeactivateUserDialog
        user={deactivateDialogUser}
        isOpen={Boolean(deactivateDialogUser)}
        onClose={() => setDeactivateDialogUser(null)}
        onConfirmDeactivate={handleConfirmDeactivate}
      />
    </div>
  );
}
