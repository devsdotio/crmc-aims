"use client";

import { useState } from "react";
import { Check, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/settings";

export interface ProfileFormProps {
  profile: UserProfile;
  saving?: boolean;
  onSaveProfile: (updated: Partial<UserProfile>) => Promise<void> | void;
}

export function ProfileForm({
  profile,
  saving = false,
  onSaveProfile,
}: ProfileFormProps) {
  const [name, setName] = useState(profile.name);
  const [department, setDepartment] = useState(profile.department);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");

  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setName(profile.name);
    setDepartment(profile.department);
    setError("");
  }

  const isDirty = name !== profile.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || saving) return;

    setError("");
    try {
      await onSaveProfile({
        name: name.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    }
  };

  const getInitials = (str: string) => {
    return str
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-border bg-bg space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="text-base font-bold text-text">Account Profile</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Update your display name. Department is assigned by an administrator.
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-2xs border-2 border-border">
          {getInitials(name || profile.name)}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="profile-name" className="block text-xs font-bold text-text">
            Full Name <span className="text-accent">*</span>
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-email" className="block text-xs font-bold text-text">
            Official School Email Address
          </label>
          <input
            id="profile-email"
            type="email"
            value={profile.email}
            readOnly
            className="w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg font-mono text-text-secondary cursor-not-allowed"
          />
          <p className="text-[11px] text-text-secondary">
            Email is managed by administrators and cannot be changed here.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-dept" className="block text-xs font-bold text-text">
            Department
          </label>
          <input
            id="profile-dept"
            type="text"
            value={department || "—"}
            readOnly
            className="w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text-secondary cursor-not-allowed"
          />
          <p className="text-[11px] text-text-secondary">
            Department is assigned on the account by an administrator.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        {error ? (
          <span className="text-xs font-semibold text-status-outofservice-text">{error}</span>
        ) : savedSuccess ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-status-active-text bg-status-active-bg/15 px-3 py-1.5 rounded-md">
            <Check className="h-4 w-4" />
            Profile updated successfully
          </span>
        ) : (
          <span className="text-xs text-text-secondary">
            {isDirty ? "Unsaved changes pending" : "No changes made"}
          </span>
        )}

        <button
          type="submit"
          disabled={!isDirty || saving}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 shadow-xs",
            isDirty && !saving
              ? "bg-accent text-accent-foreground hover:opacity-90 cursor-pointer"
              : "bg-bg-subtle text-text-secondary/40 border border-border/40 cursor-not-allowed opacity-60"
          )}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Profile
        </button>
      </div>
    </form>
  );
}
