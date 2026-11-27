import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { OutstandingAndOverdueView } from "../components/OutstandingAndOverdueView";

const title = "Outstanding Invoices";
const description = "View all invoices with outstanding balance that need payment.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/reports/outstanding",
  },
};

export default function OutstandingPage() {
  return (
    <>
      <SiteHeader />
      <main data-section="reporting" className="workspace-main workspace-polish max-w-5xl">
        <OutstandingAndOverdueView type="outstanding" />
      </main>
      <SiteFooter workspace />
    </>
  );
}
