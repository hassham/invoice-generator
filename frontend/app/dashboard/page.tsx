import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { DashboardView } from "./components/DashboardView";

const title = "Dashboard";
const description = "Your billing summary and recent invoices.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/dashboard",
  },
};

export default function DashboardPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <DashboardView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
