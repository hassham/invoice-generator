import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk, Space_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { BusinessProvider } from "./lib/BusinessContext";

// IG-326: Bevorly typefaces (docs/BRANDINGGUIDELINES.md section 6). Exposed as CSS variables and
// mapped to font-display, font-sans and font-mono in globals.css.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });

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
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} ${spaceMono.variable}`}>
      <body>
        <BusinessProvider>{children}</BusinessProvider>
      </body>
    </html>
  );
}
