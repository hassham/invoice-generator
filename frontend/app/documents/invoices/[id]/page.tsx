import type { Metadata } from "next";
import { SiteFooter } from "../../../components/landing/SiteFooter";
import { SiteHeader } from "../../../components/landing/SiteHeader";
import { InvoiceDetail } from "./components/InvoiceDetail";

export const metadata: Metadata = {
  title: "Invoice | Invoice App",
  description: "View and edit a saved invoice.",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <InvoiceDetail invoiceId={id} />
      </main>
      <SiteFooter />
    </>
  );
}
