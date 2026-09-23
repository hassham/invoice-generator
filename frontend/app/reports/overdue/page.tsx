import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { OutstandingAndOverdueView } from "../components/OutstandingAndOverdueView";

const title = "Overdue Invoices | Invoice App";
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
      <main className="mx-auto max-w-5xl px-6 py-16">
        <OutstandingAndOverdueView type="overdue" />
      </main>
      <SiteFooter />
    </>
  );
}
