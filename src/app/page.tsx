import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/sign-in");
  }

  let profileRole: string | undefined;
  try {
    const db = getDb();
    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    profileRole = profile?.role;
  } catch (error) {
    console.error("Transient error querying profile on root redirect:", error);
  }

  if (profileRole === "borrower") {
    redirect("/borrower-db/dashboard");
  }

  redirect("/dashboard");
}

