import { createClient } from "@/lib/supabase/client";

export async function performSignOut(): Promise<void> {
  // 1. Call server sign-out endpoint to clear HTTP cookies
  try {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch {
    // Best-effort network call
  }

  // 2. Client-side Supabase signOut
  try {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Best-effort
  }

  // 3. Clear residual localStorage and sessionStorage auth tokens
  try {
    if (typeof window !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("sb-") ||
            key.includes("supabase") ||
            key.includes("auth-token"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.startsWith("sb-") ||
            key.includes("supabase") ||
            key.includes("auth-token"))
        ) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch {
    // Best effort
  }

  // 4. Hard redirect to sign-in page to flush React memory and mount clean form
  if (typeof window !== "undefined") {
    window.location.replace("/sign-in");
  }
}
