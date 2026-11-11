import { Suspense } from "react";
import { ReportLayoutNav } from "@/components/reports/report-layout-nav";
import { ReportTimeframeProvider } from "@/components/reports/report-timeframe-context";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-text-secondary">Loading reports…</div>}>
      <ReportTimeframeProvider>
        <div className="flex flex-col w-full pb-6 print:block print:pb-0">
          {/* Sub-navigation bar across report domains (attached directly to the card below) */}
          <div className="sticky -top-3 z-30 bg-bg-subtle -mt-3 pt-3 transform-gpu print:hidden">
            <ReportLayoutNav />
          </div>

          {/* Main content body */}
          <div className="flex flex-col gap-3 w-full print:block print:gap-0">
            {children}
          </div>
        </div>
      </ReportTimeframeProvider>
    </Suspense>
  );
}
