import type { Metadata } from "next";
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
      <CreateInvoiceEditor />
    </main>
  );
}
