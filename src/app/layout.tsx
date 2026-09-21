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
  title: "AIMS",
  description: "Asset & Inventory Management System",
  icons: {
    icon: "/aims-logo-white.svg",
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
