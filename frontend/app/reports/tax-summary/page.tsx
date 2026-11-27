import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { TaxSummaryView } from "../components/TaxSummaryView";

const title = "Tax Summary";
const description = "View tax collected across your invoices for tax reporting purposes.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/reports/tax-summary",
  },
};

export default function TaxSummaryPage() {
  return (
    <>
      <SiteHeader />
      <main data-section="reporting" className="workspace-main workspace-polish max-w-5xl">
        <TaxSummaryView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
