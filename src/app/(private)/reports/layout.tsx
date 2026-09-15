import { ReportLayoutNav } from "@/components/reports/report-layout-nav";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full pb-6" data-theme="light">
      {/* Sub-navigation bar across report domains (attached directly to the card below) */}
      <div className="sticky -top-3 z-30 bg-bg-subtle -mt-3 pt-3 transform-gpu print:hidden">
        <ReportLayoutNav />
      </div>

      {/* Main content body */}
      <div className="flex flex-col gap-3 w-full">
        {children}
      </div>
    </div>
  );
}
