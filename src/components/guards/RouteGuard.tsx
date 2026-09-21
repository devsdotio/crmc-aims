import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCachedProfile } from "@/server/shared/auth";
import { isStaffShellRole, type AppRole } from "@/server/shared/roles";

interface RouteGuardProps {
  children: ReactNode;
  config: {
    allowedRoles: AppRole[];
    /** Override role-mismatch target (default is role home). */
    fallbackRoute?: string;
  };
}

function homeForRole(role: AppRole): string {
  if (role === "borrower") return "/borrower-db/dashboard";
  if (isStaffShellRole(role)) return "/dashboard";
  return "/sign-in";
}

function isConnectivityFailure(error: unknown): boolean {
  const text = error instanceof Error
    ? `${error.message} ${error.cause ?? ""}`
    : String(error);
  return /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|CONNECT_TIMEOUT|fetch failed|Failed query/i.test(
    text
  );
}

/**
 * Prefer relying on `(private)/layout.tsx` for auth. Use this only when a
 * nested route needs an extra role allow-list beyond the shell gate.
 */
export async function RouteGuard({ children, config }: RouteGuardProps) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/sign-in");
  }

  let profile;
  try {
    profile = await getCachedProfile(userId);
  } catch (error) {
    console.error("[RouteGuard] profile lookup failed:", error);
    if (isConnectivityFailure(error)) {
      throw new Error(
        "Database temporarily unavailable. Refresh the page in a moment and try again."
      );
    }
    redirect("/sign-in?error=no_profile");
  }

  if (!profile || profile.status !== "active") {
    redirect("/sign-in");
  }

  const role = profile.role as AppRole;

  if (!config.allowedRoles.includes(role)) {
    redirect(config.fallbackRoute ?? homeForRole(role));
  }

  return <>{children}</>;
}
