import { redirect } from "next/navigation";

/** Legacy browse catalog — Operations now uses admin-parity Assets/Supplies. */
export default function BorrowerBrowseRedirectPage() {
  redirect("/borrower-db/dashboard");
}
