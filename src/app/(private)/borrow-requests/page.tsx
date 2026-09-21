import { redirect } from "next/navigation";

export default function BorrowRequestsIndexPage() {
  redirect("/borrow-requests/assign");
}
