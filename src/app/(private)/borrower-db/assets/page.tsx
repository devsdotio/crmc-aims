import { redirect } from "next/navigation";

/** Legacy Operations → Assets URL; custody lives under Inventory. */
export default function BorrowerAssetsPage() {
  redirect("/borrower-db/inventory");
}
