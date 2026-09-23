import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { TaxSummaryView } from "../components/TaxSummaryView";

const title = "Tax Summary | Invoice App";
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
      <main className="mx-auto max-w-5xl px-6 py-16">
        <TaxSummaryView />
      </main>
      <SiteFooter />
    </>
  );
}
