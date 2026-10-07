"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBusinessProfile } from "../../../../lib/business";
import { getPurchaseOrder, type PurchaseOrder } from "../../../../lib/purchaseOrders";

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

  useEffect(() => {
    let cancelled = false;
    getBusinessProfile()
      .then((profile) => getPurchaseOrder(profile.id, purchaseOrderId))
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

  return (
    <article>
      <Link href="/documents/purchase-orders" className="text-sm text-slate-700 hover:underline">
        Back to purchase orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          Purchase Order
        </span>
        <h1 className="text-2xl font-bold text-slate-950">{purchaseOrder.poNumber}</h1>
      </div>

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
