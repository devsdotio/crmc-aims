import { redirect } from "next/navigation";

export type AuditLogTab =
  | "assets"
  | "consumables"
  | "requests"
  | "requisitions"
  | "purchaseOrders"
  | "general";

export default function AuditLogsPage() {
  redirect("/platform");
}
