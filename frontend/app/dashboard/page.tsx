import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { DashboardView } from "./components/DashboardView";

const title = { absolute: "Dashboard | BEVORLY" };
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
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
        <DashboardView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
