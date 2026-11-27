import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import Link from "next/link";
import { t } from "../lib/messages";
import { RevenueReportView } from "./components/RevenueReportView";

const title = "Revenue Reports";
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
      <main className="workspace-main max-w-5xl">
        <Link href="/reports/combined" className="mb-6 inline-block text-sm font-semibold text-ink underline">
          {t("combined.link")}
        </Link>
        <RevenueReportView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
