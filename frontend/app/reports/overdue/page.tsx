import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { OutstandingAndOverdueView } from "../components/OutstandingAndOverdueView";

const title = "Overdue Invoices";
const description = "View all invoices that are past their due date and still owe payment.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/reports/overdue",
  },
};

export default function OverduePage() {
  return (
    <>
      <SiteHeader />
      <main data-section="reporting" className="workspace-main workspace-polish max-w-5xl">
        <OutstandingAndOverdueView type="overdue" />
      </main>
      <SiteFooter workspace />
    </>
  );
}
