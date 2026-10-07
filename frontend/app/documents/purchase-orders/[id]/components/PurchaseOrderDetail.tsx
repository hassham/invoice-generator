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
    return <p className="text-sm text-slate-600">Loading purchase order…</p>;
  }

  if (state === "error") {
    return (
      <div>
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
        <Link href="/documents/purchase-orders" className="mt-4 inline-block text-sm text-slate-700 hover:underline">
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
      <Link href="/documents/purchase-orders" className="text-sm text-slate-700 hover:underline">
        Back to purchase orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            Purchase Order
          </span>
          <h1 className="text-2xl font-bold text-slate-950">{purchaseOrder.poNumber}</h1>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>

      {downloadError ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {downloadError}
        </p>
      ) : null}

      <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</dt>
          <dd className="mt-1 text-slate-900">{purchaseOrder.supplierName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ordered by</dt>
          <dd className="mt-1 text-slate-900">{purchaseOrder.businessName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue date</dt>
          <dd className="mt-1 text-slate-900">{purchaseOrder.issueDate}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required by</dt>
          <dd className="mt-1 text-slate-900">{purchaseOrder.dueDate}</dd>
        </div>
        {purchaseOrder.reference ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</dt>
            <dd className="mt-1 text-slate-900">{purchaseOrder.reference}</dd>
          </div>
        ) : null}
      </dl>

      <section className="mt-8">
        <h2 className="sr-only">Items ordered</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 text-right font-medium">Qty</th>
              <th className="py-2 pr-4 text-right font-medium">Unit price</th>
              <th className="py-2 pr-4 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.items.map((item, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-900">{item.description}</td>
                <td className="py-2 pr-4 text-right text-slate-700">
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ""}
                </td>
                <td className="py-2 pr-4 text-right text-slate-700">
                  {formatCurrency(item.unitPrice, purchaseOrder.currency)}
                </td>
                <td className="py-2 pr-4 text-right text-slate-700">
                  {formatCurrency(item.lineTotal, purchaseOrder.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <dl className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="text-slate-900">{formatCurrency(purchaseOrder.subtotal, purchaseOrder.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Tax</dt>
            <dd className="text-slate-900">{formatCurrency(purchaseOrder.taxAmount, purchaseOrder.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
            <dt className="text-slate-900">Total</dt>
            <dd className="text-slate-900">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}</dd>
          </div>
        </dl>
      </div>

      {purchaseOrder.deliveryInstructions ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">Delivery instructions</h2>
          <p className="mt-1 text-sm text-slate-700">{purchaseOrder.deliveryInstructions}</p>
        </section>
      ) : null}

      {purchaseOrder.notes ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
          <p className="mt-1 text-sm text-slate-700">{purchaseOrder.notes}</p>
        </section>
      ) : null}

      {purchaseOrder.terms ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Terms</h2>
          <p className="mt-1 text-sm text-slate-700">{purchaseOrder.terms}</p>
        </section>
      ) : null}
    </article>
  );
}
