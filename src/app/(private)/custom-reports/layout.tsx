import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCachedProfile } from "@/server/shared/auth";

/**
 * Admin-only gate for Custom Reports (separate from Beta /reports).
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

  const profile = await getCachedProfile(userId);
  if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
    redirect("/dashboard");
  }

  return children;
}
