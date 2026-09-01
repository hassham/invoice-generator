import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { InvoiceListView } from "./components/InvoiceListView";

const title = "Invoices | Invoice App";
const description = "Browse your saved invoices.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/documents/invoices",
  },
};

export default function InvoicesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <InvoiceListView />
      </main>
      <SiteFooter />
    </>
  );
}
