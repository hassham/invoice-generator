"use client";

import styles from "../../../components/ui/PublicDocument.module.css";

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
    return <p role="status" className={styles.notice}>Loading invoice…</p>;
  }

  if (error || !invoice) {
    return (
      <p role="alert" className={styles.notice} data-tone="error">
        {error ?? "This invoice could not be found."}
      </p>
    );
  }

  const canPayOnline = invoice.hasStripeAccount && invoice.amountDue > 0 && !UNPAYABLE_STATUSES.has(invoice.status);

  return (
    <article className={styles.sheet} data-kind="invoice">
      <header className={styles.sheetHead}>
        <div className={styles.merchant}>
          {invoice.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094"}${invoice.logoUrl}`}
              alt={`${invoice.businessName} logo`}
              className="h-12 w-auto object-contain"
            />
          ) : null}
          <h1>{invoice.businessName}</h1>
        </div>
        <span className={styles.status} data-status={invoice.status}>{invoice.status}</span>
      </header>
      <div className={styles.body}>
        {justPaid ? (
          <p role="status" className={styles.notice} data-tone="success">
            Payment received - thank you!
          </p>
        ) : null}
        {checkoutReturn === "cancelled" ? (
          <p role="status" className={styles.notice} data-tone="pending">
            Payment was cancelled. You can try again below.
          </p>
        ) : null}
        <dl className={styles.meta}>
          <div>
            <dt className="text-muted">Invoice</dt>
            <dd>{invoice.invoiceNumber}</dd>
          </div>
          <div>
            <dt className="text-muted">Issue date</dt>
            <dd>{invoice.issueDate}</dd>
          </div>
          <div>
            <dt className="text-muted">Due date</dt>
            <dd>{invoice.dueDate}</dd>
          </div>
          <div>
            <dt className="text-muted">Total</dt>
            <dd>{formatCurrency(invoice.totalAmount, invoice.currency)}</dd>
          </div>
        </dl>

        <div className={styles.total}>
          <p className="text-sm text-ink">Amount due</p>
          <p>{formatCurrency(invoice.amountDue, invoice.currency)}</p>
        </div>

        {payError ? (
          <p role="alert" className={styles.notice} data-tone="error">
            {payError}
          </p>
        ) : null}

        <div className={styles.actions}>
          {canPayOnline ? (
            <button
              type="button"
              onClick={handlePayNow}
              disabled={payLoading}
              className="workspace-button-primary"
            >
              {payLoading ? "Redirecting…" : "Pay Now"}
            </button>
          ) : null}
          <a
            href={hostedInvoicePdfUrl(token)}
            className={canPayOnline ? "workspace-button-secondary" : "workspace-button-primary"}
          >
            Download PDF
          </a>
        </div>
      </div>
    </article>
  );
}
