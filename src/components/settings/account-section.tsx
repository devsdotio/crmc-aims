"use client";

import type { UserProfile } from "@/types/settings";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";

export interface AccountSectionProps {
  profile: UserProfile;
  savingProfile?: boolean;
  savingPassword?: boolean;
  onSaveProfile: (updated: Partial<UserProfile>) => Promise<void> | void;
  onChangePassword: (payload: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
}

export function AccountSection({
  profile,
  savingProfile,
  savingPassword,
  onSaveProfile,
  onChangePassword,
}: AccountSectionProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <ProfileForm
        profile={profile}
        saving={savingProfile}
        onSaveProfile={onSaveProfile}
      />
      <ChangePasswordForm
        saving={savingPassword}
        onChangePassword={onChangePassword}
      />
    </div>
  );
}
