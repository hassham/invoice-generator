import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { DashboardView } from "./components/DashboardView";

const title = "Dashboard | Invoice App";
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
      <main className="mx-auto max-w-5xl px-6 py-16">
        <DashboardView />
      </main>
      <SiteFooter />
    </>
  );
}
