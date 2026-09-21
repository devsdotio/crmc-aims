"use client";

import { isAssetOperatorRole } from "@/constants/roles";
import { useMeQuery } from "@/features/users/client";

/** Whether the signed-in user may mutate assets/inventory (admin or superadmin). */
export function useAssetOperator() {
  const { data: me, isLoading } = useMeQuery();
  return {
    canOperate: isAssetOperatorRole(me?.role),
    isLoading,
    role: me?.role,
  };
}
