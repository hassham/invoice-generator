"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBusinessProfile } from "../../../../lib/business";
import {
  downloadPurchaseOrderPdf,
  getPurchaseOrder,
  type PurchaseOrder,
} from "../../../../lib/purchaseOrders";

type LoadState = "loading" | "loaded" | "error";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * IG-236/IG-292: leads with an explicit "Purchase Order" document type rather than relying on the
 * number prefix alone, so this page cannot be mistaken for an invoice or estimate detail view.
 */
export function PurchaseOrderDetail({ purchaseOrderId }: { purchaseOrderId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBusinessProfile()
      .then((profile) => {
        if (!cancelled) {
          setBusinessId(profile.id);
        }
        return getPurchaseOrder(profile.id, purchaseOrderId);
      })
      .then((result) => {
        if (!cancelled) {
          setPurchaseOrder(result);
          setState("loaded");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load this purchase order.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [purchaseOrderId]);

  if (state === "loading") {
    return <p className="text-sm text-muted">Loading purchase order…</p>;
  }

  if (state === "error") {
    return (
      <div>
        <p role="alert" className="rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {error}
        </p>
        <Link href="/documents/purchase-orders" className="mt-4 inline-block text-sm text-ink hover:underline">
          Back to purchase orders
        </Link>
      </div>
    );
  }

  if (!purchaseOrder) {
    return null;
  }

  const handleDownload = async () => {
    if (!businessId) {
      return;
    }

    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadPurchaseOrderPdf(businessId, purchaseOrder.id, purchaseOrder.poNumber);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download this purchase order.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article>
      <Link href="/documents/purchase-orders" className="text-sm text-ink hover:underline">
        Back to purchase orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-status-pending-bg px-3 py-1 text-xs font-semibold text-status-pending-fg">
            Purchase Order
          </span>
          <h1 className="workspace-heading">{purchaseOrder.poNumber}</h1>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="workspace-button-primary disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>

      {downloadError ? (
        <p role="alert" className="mt-4 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {downloadError}
        </p>
      ) : null}

      <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Supplier</dt>
          <dd className="mt-1 text-ink">{purchaseOrder.supplierName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Ordered by</dt>
          <dd className="mt-1 text-ink">{purchaseOrder.businessName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Issue date</dt>
          <dd className="mt-1 text-ink">{purchaseOrder.issueDate}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Required by</dt>
          <dd className="mt-1 text-ink">{purchaseOrder.dueDate}</dd>
        </div>
        {purchaseOrder.reference ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Reference</dt>
            <dd className="mt-1 text-ink">{purchaseOrder.reference}</dd>
          </div>
        ) : null}
      </dl>

      <section className="mt-8">
        <h2 className="sr-only">Items ordered</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 text-right tabular-nums font-medium">Qty</th>
              <th className="py-2 pr-4 text-right tabular-nums font-medium">Unit price</th>
              <th className="py-2 pr-4 text-right tabular-nums font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.items.map((item, index) => (
              <tr key={index} className="border-b border-border">
                <td className="py-2 pr-4 text-ink">{item.description}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-ink">
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ""}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-ink">
                  {formatCurrency(item.unitPrice, purchaseOrder.currency)}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-ink">
                  {formatCurrency(item.lineTotal, purchaseOrder.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-8 border-t border-border pt-6">
        <dl className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-ink">{formatCurrency(purchaseOrder.subtotal, purchaseOrder.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Tax</dt>
            <dd className="text-ink">{formatCurrency(purchaseOrder.taxAmount, purchaseOrder.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <dt className="text-ink">Total</dt>
            <dd className="text-ink">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}</dd>
          </div>
        </dl>
      </div>

      {purchaseOrder.deliveryInstructions ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">Delivery instructions</h2>
          <p className="mt-1 text-sm text-ink">{purchaseOrder.deliveryInstructions}</p>
        </section>
      ) : null}

      {purchaseOrder.notes ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Notes</h2>
          <p className="mt-1 text-sm text-ink">{purchaseOrder.notes}</p>
        </section>
      ) : null}

      {purchaseOrder.terms ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Terms</h2>
          <p className="mt-1 text-sm text-ink">{purchaseOrder.terms}</p>
        </section>
      ) : null}
    </article>
  );
}
