import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { RevenueReportView } from "./components/RevenueReportView";

const title = "Revenue Reports | Invoice App";
const description = "View your revenue aggregated by month, quarter, or year.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/reports",
  },
};

export default function ReportsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <RevenueReportView />
      </main>
      <SiteFooter />
    </>
  );
}
