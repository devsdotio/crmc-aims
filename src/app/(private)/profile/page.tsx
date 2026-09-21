"use client";

import { useToast } from "@/components/providers/toast-context";
import { AccountSection } from "@/components/settings/account-section";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import {
  useChangePasswordMutation,
  useMeQuery,
  useUpdateMeMutation,
} from "@/features/users/client/use-users";
import type { UserProfile } from "@/types/settings";
import { Settings } from "lucide-react";

export default function ProfilePage() {
  const {
    data: me,
    isLoading: meLoading,
    isError: meError,
    error: meErr,
    refetch: refetchMe,
  } = useMeQuery();
  const updateMeMutation = useUpdateMeMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const toast = useToast();

  const profile: UserProfile | null = me
    ? {
        id: me.id,
        name: me.name,
        email: me.email,
        role: me.role,
        department: me.department ?? "",
      }
    : null;

  const handleSaveProfile = async (updated: Partial<UserProfile>) => {
    await updateMeMutation.mutateAsync({
      name: updated.name,
    });
    toast.success("Profile updated.");
  };

  const handleChangePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
  }) => {
    await changePasswordMutation.mutateAsync(payload);
    toast.success("Password updated.");
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle">
      {/* Top Header */}
      <div className="px-4 md:px-6 py-4 bg-bg shrink-0 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a3260]/10 text-[#2a3260]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-text">
              Account & Profile Settings
            </h1>
            <p className="text-xs text-text-secondary">
              Update personal account details, security credentials, and application preferences
            </p>
          </div>
        </div>
      </div>

      {/* Main Scoped Scroll Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
        <div className="w-full space-y-6 max-w-4xl">
          {meError ? (
            <QueryErrorBanner
              message={meErr?.message || "Failed to load profile details"}
              onRetry={() => void refetchMe()}
            />
          ) : null}

          {meLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-64 rounded-2xl bg-bg border border-border" />
              <div className="h-64 rounded-2xl bg-bg border border-border" />
            </div>
          ) : profile ? (
            <AccountSection
              profile={profile}
              savingProfile={updateMeMutation.isPending}
              savingPassword={changePasswordMutation.isPending}
              onSaveProfile={handleSaveProfile}
              onChangePassword={handleChangePassword}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
