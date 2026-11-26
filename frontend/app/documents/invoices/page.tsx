import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { InvoiceListView } from "./components/InvoiceListView";

const title = "Invoices";
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
      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        {/* InvoiceListView reads/writes the URL query string via useSearchParams (next/navigation)
            - the App Router requires a Suspense boundary around any such client component on a
            statically-rendered route, or `next build` fails with a "missing suspense boundary"
            error. */}
        <Suspense fallback={<p className="text-sm text-muted">Loading invoices…</p>}>
          <InvoiceListView />
        </Suspense>
      </main>
      <SiteFooter workspace />
    </>
  );
}
