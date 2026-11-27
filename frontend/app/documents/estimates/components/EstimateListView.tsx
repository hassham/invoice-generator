"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listEstimates, type EstimateListItem } from "../../../lib/estimate";

type LoadState = "loading" | "loaded" | "error";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * IG-220: deliberately minimal for this first Story - no search/status filter/sort UI yet
 * (EstimateListQuery's own doc comment calls this out as a scope boundary, not an oversight).
 * Enough to find and open a saved estimate, matching this Story's "distinguished... on screen" AC.
 */
export function EstimateListView() {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EstimateListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    listEstimates()
      .then((result) => {
        if (!cancelled) {
          setItems(result.items);
          setState("loaded");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load your estimates.");
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
        <h1 className="workspace-heading">Estimates</h1>
        <Link
          href="/estimate/create"
          className="workspace-button-primary"
        >
          New Estimate
        </Link>
      </div>

      {state === "loading" ? <p className="mt-6 text-sm text-muted">Loading estimates…</p> : null}

      {state === "error" ? (
        <p role="alert" className="mt-6 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {error}
        </p>
      ) : null}

      {state === "loaded" && items.length === 0 ? <p className="mt-6 text-sm text-muted">No estimates yet.</p> : null}

      {state === "loaded" && items.length > 0 ? (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-4 font-medium">Estimate</th>
              <th className="py-2 pr-4 font-medium">Customer</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Issue date</th>
              <th className="py-2 pr-4 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="py-2 pr-4">
                  <Link href={`/documents/estimates/${item.id}`} className="font-medium text-ink hover:underline">
                    {item.estimateNumber}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-ink">{item.customerName}</td>
                <td className="py-2 pr-4">
                  <span className="rounded-full bg-status-draft-bg px-3 py-1 text-xs font-semibold text-ink">{item.status}</span>
                </td>
                <td className="py-2 pr-4 text-ink">{item.issueDate}</td>
                <td className="py-2 pr-4 text-ink">{formatCurrency(item.totalAmount, item.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
