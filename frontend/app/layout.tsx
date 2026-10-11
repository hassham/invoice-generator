import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { BusinessProvider } from "./lib/BusinessContext";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Invoice App — Free Invoice Generator",
    template: "%s | Invoice App",
  },
  description: "Fast, professional invoicing for small businesses.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <BusinessProvider>{children}</BusinessProvider>
      </body>
    </html>
  );
}
