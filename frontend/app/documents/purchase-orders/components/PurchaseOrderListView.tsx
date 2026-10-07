"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBusinessProfile } from "../../../lib/business";
import { listPurchaseOrders, type PurchaseOrder } from "../../../lib/purchaseOrders";

type LoadState = "loading" | "loaded" | "error";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * IG-236/IG-292: a purchase order is a supplier-facing document, so this list says "Supplier"
 * rather than "Customer" and badges every row with its document type - the AC is that a purchase
 * order is never mistaken for an invoice or an estimate at a glance.
 */
export function PurchaseOrderListView() {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    getBusinessProfile()
      .then((profile) => listPurchaseOrders(profile.id))
      .then((result) => {
        if (!cancelled) {
          setItems(result);
          setState("loaded");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load your purchase orders.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-950">Purchase Orders</h1>
        <Link
          href="/documents/purchase-orders/new"
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          New purchase order
        </Link>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Orders you have placed with your suppliers. These are separate from the invoices you send to
        your customers, and use their own numbering sequence.
      </p>

      {state === "loading" ? (
        <p className="mt-6 text-sm text-slate-600">Loading purchase orders…</p>
      ) : null}

      {state === "error" ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {state === "loaded" && items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">
          No purchase orders yet.{" "}
          <Link href="/documents/purchase-orders/new" className="font-medium text-slate-950 hover:underline">
            Raise your first purchase order
          </Link>
          .
        </p>
      ) : null}

      {state === "loaded" && items.length > 0 ? (
        <table className="mt-6 w-full text-left text-sm">
          <caption className="sr-only">Purchase orders</caption>
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Purchase order</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Supplier</th>
              <th className="py-2 pr-4 font-medium">Issue date</th>
              <th className="py-2 pr-4 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <Link
                    href={`/documents/purchase-orders/${item.id}`}
                    className="font-medium text-slate-950 hover:underline"
                  >
                    {item.poNumber}
                  </Link>
                </td>
                <td className="py-2 pr-4">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                    Purchase Order
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-700">{item.supplierName}</td>
                <td className="py-2 pr-4 text-slate-700">{item.issueDate}</td>
                <td className="py-2 pr-4 text-slate-700">
                  {formatCurrency(item.totalAmount, item.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
