import type { Metadata } from "next";
import { InvoiceEditorLayout } from "./components/InvoiceEditorLayout";

const title = "Create Invoice | Invoice App";
const description = "Build a professional invoice - no account required to get started.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/invoice/create",
  },
};

// FSD section 11's editor/preview panels (invoice number, line items, totals, live preview,
// etc.) land in later Stories (S22-S26) - this Story (S21) is only the responsive layout shell
// they'll be filled into, so these placeholders describe what's coming rather than inventing
// fields ahead of their own Story.
export default function CreateInvoicePage() {
  return (
    <main>
      <h1 className="sr-only">Create an invoice</h1>
      <InvoiceEditorLayout
        editor={
          <div className="rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-950">Invoice details</h2>
            <p className="mt-2 text-sm text-slate-600">
              The invoice form will appear here.
            </p>
          </div>
        }
        preview={
          <div className="rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-950">Live preview</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your invoice preview will appear here as you type.
            </p>
          </div>
        }
      />
    </main>
  );
}
