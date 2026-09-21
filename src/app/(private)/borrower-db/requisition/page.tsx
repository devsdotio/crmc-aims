"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequisitionSlip } from "@/components/requisition-slip/RequisitionSlip";

export default function RequisitionPage() {
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/borrower-db/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg py-1 pr-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <RequisitionSlip 
        open={true} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            router.push('/borrower-db/dashboard');
          }
        }} 
      />
    </div>
  );
}
