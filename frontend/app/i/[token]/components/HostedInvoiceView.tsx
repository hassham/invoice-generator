"use client";

import { useEffect, useState } from "react";
import { getHostedInvoice, hostedInvoicePdfUrl, type HostedInvoice } from "../../lib/hostedInvoice";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

interface HostedInvoiceViewProps {
  token: string;
}

/**
 * IG-214: docs/PRD.md section 19's exact scope - Business Logo, Invoice, Amount Due, Payment
 * Status, Download PDF. No customer account/session involved anywhere in this component.
 */
export function HostedInvoiceView({ token }: HostedInvoiceViewProps) {
  const [invoice, setInvoice] = useState<HostedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getHostedInvoice(token)
      .then((loaded) => {
        if (!cancelled) {
          setInvoice(loaded);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "This invoice could not be found.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading invoice…</p>;
  }

  if (error || !invoice) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "This invoice could not be found."}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {invoice.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094"}${invoice.logoUrl}`}
              alt={`${invoice.businessName} logo`}
              className="h-12 w-auto object-contain"
            />
          ) : null}
          <p className="text-lg font-semibold text-slate-950">{invoice.businessName}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{invoice.status}</span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-slate-500">Invoice</p>
          <p className="font-medium text-slate-950">{invoice.invoiceNumber}</p>
        </div>
        <div>
          <p className="text-slate-500">Issue date</p>
          <p className="font-medium text-slate-950">{invoice.issueDate}</p>
        </div>
        <div>
          <p className="text-slate-500">Due date</p>
          <p className="font-medium text-slate-950">{invoice.dueDate}</p>
        </div>
        <div>
          <p className="text-slate-500">Total</p>
          <p className="font-medium text-slate-950">{formatCurrency(invoice.totalAmount, invoice.currency)}</p>
        </div>
      </div>

      <div className="mt-8 rounded-md bg-slate-50 px-4 py-4">
        <p className="text-sm text-slate-600">Amount due</p>
        <p className="text-2xl font-bold text-slate-950">{formatCurrency(invoice.amountDue, invoice.currency)}</p>
      </div>

      <a
        href={hostedInvoicePdfUrl(token)}
        className="mt-6 inline-block rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
      >
        Download PDF
      </a>
    </div>
  );
}
