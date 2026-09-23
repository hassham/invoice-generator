import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { OutstandingAndOverdueView } from "../components/OutstandingAndOverdueView";

const title = "Outstanding Invoices | Invoice App";
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
      <main className="mx-auto max-w-5xl px-6 py-16">
        <OutstandingAndOverdueView type="outstanding" />
      </main>
      <SiteFooter />
    </>
  );
}
