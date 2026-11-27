"use client";

import styles from "../../../components/ui/PublicDocument.module.css";

import { useEffect, useState } from "react";
import { acceptEstimate, declineEstimate, getHostedEstimate, hostedEstimatePdfUrl, type HostedEstimate } from "../../lib/hostedEstimate";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

interface HostedEstimateViewProps {
  token: string;
}

type EstimateAction = "accept" | "decline";

/**
 * IG-221/222: mirrors HostedInvoiceView.tsx's pre-payment shape (business logo, document number,
 * status, dates, total, Download PDF), plus IG-222's customer-facing Accept/Decline action - shown
 * only while the estimate is Sent, same as HostedInvoiceView's Pay Now button gating on status.
 */
export function HostedEstimateView({ token }: HostedEstimateViewProps) {
  const [estimate, setEstimate] = useState<HostedEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<EstimateAction | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHostedEstimate(token)
      .then((loaded) => {
        if (!cancelled) {
          setEstimate(loaded);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "This estimate could not be found.");
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
    return <p role="status" className={styles.notice}>Loading estimate…</p>;
  }

  if (error || !estimate) {
    return (
      <p role="alert" className={styles.notice} data-tone="error">
        {error ?? "This estimate could not be found."}
      </p>
    );
  }

  async function handleAction(action: EstimateAction) {
    setActionError(null);
    setActionPending(action);
    try {
      const updated = action === "accept" ? await acceptEstimate(token) : await declineEstimate(token);
      setEstimate(updated);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : `This estimate can't be ${action}ed right now.`);
    } finally {
      setActionPending(null);
    }
  }

  const canRespond = estimate.status === "Sent";

  return (
    <article className={styles.sheet} data-kind="estimate">
      <header className={styles.sheetHead}>
        <div className={styles.merchant}>
          {estimate.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094"}${estimate.logoUrl}`}
              alt={`${estimate.businessName} logo`}
              className="h-12 w-auto object-contain"
            />
          ) : null}
          <h1>{estimate.businessName}</h1>
        </div>
        <span className={styles.status} data-status={estimate.status}>{estimate.status}</span>
      </header>
      <div className={styles.body}>
        <dl className={styles.meta}>
          <div>
            <dt className="text-muted">Estimate</dt>
            <dd>{estimate.estimateNumber}</dd>
          </div>
          <div>
            <dt className="text-muted">Issue date</dt>
            <dd>{estimate.issueDate}</dd>
          </div>
          <div>
            <dt className="text-muted">Expiry date</dt>
            <dd>{estimate.expiryDate}</dd>
          </div>
          <div>
            <dt className="text-muted">Total</dt>
            <dd>{formatCurrency(estimate.totalAmount, estimate.currency)}</dd>
          </div>
        </dl>

        {estimate.status === "Accepted" ? (
          <p role="status" className={styles.notice} data-tone="success">
            You accepted this estimate.
          </p>
        ) : null}
        {estimate.status === "Declined" ? (
          <p role="status" className={styles.notice}>
            You declined this estimate.
          </p>
        ) : null}

        {actionError ? (
          <p role="alert" className={styles.notice} data-tone="error">
            {actionError}
          </p>
        ) : null}

        <div className={styles.actions}>
          {canRespond ? (
            <>
              <button
                type="button"
                onClick={() => handleAction("accept")}
                disabled={actionPending !== null}
                className="workspace-button-primary"
              >
                {actionPending === "accept" ? "Accepting…" : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => handleAction("decline")}
                disabled={actionPending !== null}
                className="workspace-button-secondary"
              >
                {actionPending === "decline" ? "Declining…" : "Decline"}
              </button>
            </>
          ) : null}
          <a
            href={hostedEstimatePdfUrl(token)}
            className={canRespond ? "workspace-button-secondary" : "workspace-button-primary"}
          >
            Download PDF
          </a>
        </div>
      </div>
    </article>
  );
}
