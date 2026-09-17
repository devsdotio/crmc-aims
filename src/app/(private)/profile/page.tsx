"use client";

import { useToast } from "@/components/providers/toast-context";
import { AccountSection } from "@/components/settings/account-section";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import { useSandboxVisibility } from "@/components/providers/sandbox-visibility-context";
import {
  useChangePasswordMutation,
  useMeQuery,
  useUpdateMeMutation,
} from "@/features/users/client/use-users";
import type { UserProfile } from "@/types/settings";
import { Settings, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { canToggle, preference, setShowSandbox } = useSandboxVisibility();

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
            <>
              <AccountSection
                profile={profile}
                savingProfile={updateMeMutation.isPending}
                savingPassword={changePasswordMutation.isPending}
                onSaveProfile={handleSaveProfile}
                onChangePassword={handleChangePassword}
              />

              {canToggle && (
                <div className="rounded-2xl border border-border bg-bg p-6 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 mt-0.5">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text">
                          Sandbox & Demonstration Mode
                        </h3>
                        <p className="text-xs text-text-secondary mt-1">
                          Show mock and test datasets alongside real production records for testing and demonstration workflows.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSandbox(!preference)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                        preference ? "bg-[#2a3260]" : "bg-neutral-200"
                      )}
                      role="switch"
                      aria-checked={preference}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                          preference ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
