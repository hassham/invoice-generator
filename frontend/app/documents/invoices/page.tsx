import type { Metadata } from "next";
import { Suspense } from "react";
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
        {/* InvoiceListView reads/writes the URL query string via useSearchParams (next/navigation)
            - the App Router requires a Suspense boundary around any such client component on a
            statically-rendered route, or `next build` fails with a "missing suspense boundary"
            error. */}
        <Suspense fallback={<p className="text-sm text-slate-600">Loading invoices…</p>}>
          <InvoiceListView />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
