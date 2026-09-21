import { headers } from "next/headers";
import { redirect } from "next/navigation";

import DashboardLayout from "@/components/dashboard-layout";
import { createClient } from "@/lib/supabase/server";
import { type ProfileRow } from "@/server/db/schema";
import { getCachedProfile } from "@/server/shared/auth";
import { UserService } from "@/server/modules/users/user.service";
import { isStaffShellRole, type AppRole } from "@/server/shared/roles";

/**
 * Authenticated app shell gate.
 *
 * Auth verification uses `getClaims()` (local JWT verify when possible) —
 * not `getUser()` which always round-trips the Auth server (~1s+ on remote
 * Supabase). Profile gate uses in-memory cached profile to avoid redundant DB queries.
 *
 * Do not call supabase.auth.signOut() here and then redirect.
 * Cookie clears from Server Components often never land on the redirect
 * response → proxy still sees a session → bounce loop.
 *
 * Gate-failure redirects use `?error=…` and SignInForm clears the session.
 *
 * Borrowers share this shell (role-filtered sidebar) but may only open
 * `/borrower-db/*`. Staff shell roles may open the rest of the app.
 */
export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/sign-in");
  }

  let profile: ProfileRow | null | undefined;
  try {
    profile = await getCachedProfile(userId);
  } catch (error) {
    console.error("[private-layout] profile lookup failed:", error);
    const text =
      error instanceof Error
        ? `${error.message} ${error.cause ?? ""}`
        : String(error);
    const unavailable = /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|CONNECT_TIMEOUT|fetch failed|Failed query/i.test(
      text
    );
    if (unavailable) {
      throw new Error(
        "Database temporarily unavailable. Refresh the page in a moment and try again."
      );
    }
    redirect("/sign-in?error=no_profile");
  }

  if (!profile) {
    redirect("/sign-in?error=no_profile");
  }

  if (profile.status !== "active") {
    redirect("/sign-in?error=deactivated");
  }

  const role = profile.role as AppRole;
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isProfileRoute = pathname === "/profile";
  const onBorrowerPortal =
    pathname === "/borrower-db" || pathname.startsWith("/borrower-db/");

  if (role === "borrower") {
    // Keep borrowers inside borrower portal or profile; redirect if accessing staff/platform routes
    if (pathname && !onBorrowerPortal && !isProfileRoute) {
      redirect("/borrower-db/dashboard");
    }
  } else if (role === "superadmin") {
    // Superadmins manage institutions and platform governance; redirect tenant ops / borrower dashboard to platform
    if (pathname === "/dashboard" || onBorrowerPortal) {
      redirect("/platform/tenants");
    }
  } else if (isStaffShellRole(role)) {
    // Keep staff inside staff routes; redirect if accessing borrower or platform superadmin routes
    if (pathname && (onBorrowerPortal || pathname.startsWith("/platform"))) {
      redirect("/dashboard");
    }
  } else {
    // Only genuine unknown or unassigned roles bounce with error
    redirect("/sign-in?error=no_profile");
  }

  // Best-effort presence (never block entry)
  void new UserService().recordActivity(userId);

  return (
    <DashboardLayout
      initialProfile={{
        name: profile.fullName,
        email: profile.email,
        role: profile.role as AppRole,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
