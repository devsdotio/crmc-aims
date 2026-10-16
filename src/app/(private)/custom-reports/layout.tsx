import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCachedProfile } from "@/server/shared/auth";

function isDbUnavailable(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.message} ${error.cause ?? ""}`
      : String(error);
  return /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|CONNECT_TIMEOUT|fetch failed|Failed query/i.test(
    text
  );
}

/**
 * Admin-only gate for Custom Reports (separate from Beta /reports).
 * Parent `(private)/layout` already authenticates; this only enforces role.
 */
export default async function CustomReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/sign-in");

  try {
    const profile = await getCachedProfile(userId);
    if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
      redirect("/dashboard");
    }
  } catch (error) {
    if (isDbUnavailable(error)) {
      throw new Error(
        "Database temporarily unavailable. Refresh the page in a moment and try again."
      );
    }
    redirect("/dashboard");
  }

  return children;
}
