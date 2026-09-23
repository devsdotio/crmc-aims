import type { Metadata } from "next";
import localFont from "next/font/local";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/providers/toast-context";
import { LoadingProvider } from "@/components/providers/loading-context";
import { ConfirmProvider } from "@/components/providers/confirm-context";
import "./globals.css";

const quicksand = localFont({
  src: "../../public/fonts/Quicksand/Quicksand-VariableFont_wght.ttf",
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "CRMC AIMS",
  title: {
    default: "Asset & Inventory Management System",
    template: "%s · CRMC AIMS",
  },
  description:
    "Asset & Inventory Management System for Cebu Roosevelt Memorial Colleges — track equipment, supplies, purchase orders, and custody in one place.",
  icons: {
    icon: [{ url: "/aims-logo-white.svg", type: "image/svg+xml" }],
    shortcut: "/aims-logo.svg",
    apple: [{ url: "/aims-logo.png" }],
  },
  openGraph: {
    title: " Asset & Inventory Management",
    description:
      "Asset & Inventory Management System for Cebu Roosevelt Memorial Colleges.",
    siteName: "Asset & Inventory Management",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-bg-subtle text-text overflow-hidden">
        <ToastProvider>
          <ConfirmProvider>
            <LoadingProvider>
              <QueryProvider>{children}</QueryProvider>
            </LoadingProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
