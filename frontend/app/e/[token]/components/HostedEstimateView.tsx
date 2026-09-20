"use client";

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
    return <p className="text-sm text-slate-500">Loading estimate…</p>;
  }

  if (error || !estimate) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {estimate.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094"}${estimate.logoUrl}`}
              alt={`${estimate.businessName} logo`}
              className="h-12 w-auto object-contain"
            />
          ) : null}
          <p className="text-lg font-semibold text-slate-950">{estimate.businessName}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{estimate.status}</span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-slate-500">Estimate</p>
          <p className="font-medium text-slate-950">{estimate.estimateNumber}</p>
        </div>
        <div>
          <p className="text-slate-500">Issue date</p>
          <p className="font-medium text-slate-950">{estimate.issueDate}</p>
        </div>
        <div>
          <p className="text-slate-500">Expiry date</p>
          <p className="font-medium text-slate-950">{estimate.expiryDate}</p>
        </div>
        <div>
          <p className="text-slate-500">Total</p>
          <p className="font-medium text-slate-950">{formatCurrency(estimate.totalAmount, estimate.currency)}</p>
        </div>
      </div>

      {estimate.status === "Accepted" ? (
        <p role="status" className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          You accepted this estimate.
        </p>
      ) : null}
      {estimate.status === "Declined" ? (
        <p role="status" className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          You declined this estimate.
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {canRespond ? (
          <>
            <button
              type="button"
              onClick={() => handleAction("accept")}
              disabled={actionPending !== null}
              className="inline-block rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionPending === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => handleAction("decline")}
              disabled={actionPending !== null}
              className="inline-block rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionPending === "decline" ? "Declining…" : "Decline"}
            </button>
          </>
        ) : null}
        <a
          href={hostedEstimatePdfUrl(token)}
          className="inline-block rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}
