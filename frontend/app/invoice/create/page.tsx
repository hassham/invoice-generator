import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateInvoiceEditor } from "./components/CreateInvoiceEditor";

const title = "Create Invoice | Invoice App";
const description = "Build a professional invoice - no account required to get started.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/invoice/create",
  },
};

// Line items, totals, the chosen template and PDF/print output land in later Stories (S23-S26) -
// this page currently covers only the invoice header, seller and customer details from S22.
export default function CreateInvoicePage() {
  return (
    <main>
      <h1 className="sr-only">Create an invoice</h1>
      {/* IG-204: CreateInvoiceEditor reads ?template=<templateCode> via useSearchParams
          (next/navigation) - the App Router requires a Suspense boundary around any such client
          component on a statically-rendered route, or `next build` fails with a "missing suspense
          boundary" error. Same convention as documents/invoices/page.tsx. */}
      <Suspense fallback={<p className="p-6 text-sm text-slate-600">Loading…</p>}>
        <CreateInvoiceEditor />
      </Suspense>
    </main>
  );
}
