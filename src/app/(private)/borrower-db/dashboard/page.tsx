import { BorrowerDashboard } from "../../../../components/borrower-db/borrower-dashboard";

export const metadata = {
  title: "Requester portal | AIMS",
  description: "Overview of department requests, active equipment custody, and history.",
};

export default function BorrowerDashboardPage() {
  return (
    <section id="requester-dashboard" aria-label="Requester Dashboard" className="h-full flex flex-col min-h-0">
      <BorrowerDashboard />
    </section>
  );
}
