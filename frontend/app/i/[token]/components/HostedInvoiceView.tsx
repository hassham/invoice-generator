"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  confirmCheckoutSession,
  createCheckoutSession,
  getHostedInvoice,
  hostedInvoicePdfUrl,
  type HostedInvoice,
} from "../../lib/hostedInvoice";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

const UNPAYABLE_STATUSES = new Set(["Paid", "Cancelled"]);

interface HostedInvoiceViewProps {
  token: string;
}

/**
 * IG-214: docs/PRD.md section 19's exact scope - Business Logo, Invoice, Amount Due, Payment
 * Status, Download PDF. IG-216 adds Pay Now + a post-payment confirmation state. No customer
 * account/session involved anywhere in this component.
 */
export function HostedInvoiceView({ token }: HostedInvoiceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<HostedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  // IG-216: Stripe Checkout's own redirect back is a full-page navigation, so a query param is the
  // only way it can hand back a result - captured once via a lazy initializer (same
  // BusinessProfileSettings.tsx precedent for IG-219's Stripe Connect redirect), then stripped so a
  // refresh doesn't keep re-confirming or re-showing the cancelled notice.
  const [checkoutReturn] = useState<{ sessionId: string } | "cancelled" | null>(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      return { sessionId };
    }
    if (searchParams.get("checkout") === "cancelled") {
      return "cancelled";
    }
    return null;
  });
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    if (checkoutReturn) {
      router.replace(`/i/${token}`);
    }
    // Deliberately mount-only - checkoutReturn never changes after its lazy init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    getHostedInvoice(token)
      .then(async (loaded) => {
        if (cancelled) {
          return;
        }
        if (checkoutReturn && typeof checkoutReturn === "object") {
          try {
            const confirmation = await confirmCheckoutSession(token, checkoutReturn.sessionId);
            if (!cancelled) {
              setInvoice(confirmation.invoice);
              setJustPaid(confirmation.paid);
              return;
            }
          } catch {
            // Confirmation failed (e.g. network issue) - falls through to showing the invoice as
            // loaded above, just without the confirmation banner. The webhook-based reconciliation
            // this app will eventually add (IG-217) is the real safety net for this case.
          }
        }
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
    // checkoutReturn is intentionally excluded - it's stable after the lazy init above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handlePayNow() {
    setPayError(null);
    setPayLoading(true);
    try {
      const session = await createCheckoutSession(token);
      window.location.href = session.url;
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "This invoice can't be paid online right now.");
      setPayLoading(false);
    }
  }

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

  const canPayOnline = invoice.hasStripeAccount && invoice.amountDue > 0 && !UNPAYABLE_STATUSES.has(invoice.status);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      {justPaid ? (
        <p role="status" className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Payment received - thank you!
        </p>
      ) : null}
      {checkoutReturn === "cancelled" ? (
        <p role="status" className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Payment was cancelled. You can try again below.
        </p>
      ) : null}
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

      {payError ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {payError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {canPayOnline ? (
          <button
            type="button"
            onClick={handlePayNow}
            disabled={payLoading}
            className="inline-block rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {payLoading ? "Redirecting…" : "Pay Now"}
          </button>
        ) : null}
        <a
          href={hostedInvoicePdfUrl(token)}
          className="inline-block rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}
