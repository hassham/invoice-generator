"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listInvoices, type InvoiceListResult } from "../../../lib/invoiceList";

type LoadState = "loading" | "loaded" | "error";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = value !== null ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePageSize(value: string | null): number {
  const parsed = parsePositiveInt(value, DEFAULT_PAGE_SIZE);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

/**
 * FSD section 45 (/documents/invoices) - columns Invoice Number, Customer, Date, Due Date,
 * Amount, Amount Due, Status. Row actions here are just "View" (links to IG-47's detail page,
 * which already covers Edit) - Duplicate/Download/Mark Paid/Cancel/Delete are FSD's fuller
 * narrative for a row actions menu, not this Story's own AC, and none of those operations exist
 * yet anyway (separate Stories). Page/pageSize live in the URL (FSD section 112's 25/50/100
 * options) so the active view survives a refresh or a shared link, not just component state.
 */
export function InvoiceListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const [state, setState] = useState<LoadState>("loading");
  const [result, setResult] = useState<InvoiceListResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Resets to "loading" on every page/pageSize change (not just the first render, which
    // already starts "loading" via useState's initial value) - legitimate re-sync with the URL
    // params driving this fetch, not the "derive state from props" anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("loading");
    listInvoices(page, pageSize)
      .then((loaded) => {
        if (!cancelled) {
          setResult(loaded);
          setState("loaded");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load invoices.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  const navigateTo = (nextPage: number, nextPageSize: number) => {
    router.push(`/documents/invoices?page=${nextPage}&pageSize=${nextPageSize}`);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-950">Invoices</h1>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {state === "loading" ? <p className="mt-6 text-sm text-slate-600">Loading invoices…</p> : null}

      {state === "loaded" && result && result.items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">
          No invoices yet.{" "}
          <Link href="/invoice/create" className="font-medium text-slate-950 hover:underline">
            Create your first invoice
          </Link>
          .
        </p>
      ) : null}

      {state === "loaded" && result && result.items.length > 0 ? (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-medium">Invoice Number</th>
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Due Date</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Amount Due</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-950">{invoice.invoiceNumber}</td>
                    <td className="py-2 pr-4 text-slate-700">{invoice.customerName || "—"}</td>
                    <td className="py-2 pr-4 text-slate-700">{invoice.issueDate}</td>
                    <td className="py-2 pr-4 text-slate-700">{invoice.dueDate}</td>
                    <td className="py-2 pr-4 text-slate-700">{formatCurrency(invoice.totalAmount, invoice.currency)}</td>
                    <td className="py-2 pr-4 text-slate-700">{formatCurrency(invoice.amountDue, invoice.currency)}</td>
                    <td className="py-2 pr-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{invoice.status}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <Link href={`/documents/invoices/${invoice.id}`} className="font-medium text-slate-950 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <label htmlFor="invoice-page-size" className="font-medium">
                Per page
              </label>
              <select
                id="invoice-page-size"
                value={pageSize}
                onChange={(event) => navigateTo(1, Number.parseInt(event.target.value, 10))}
                className="rounded-md border border-slate-300 px-2 py-1"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigateTo(page - 1, pageSize)}
                disabled={page <= 1}
                className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => navigateTo(page + 1, pageSize)}
                disabled={page >= totalPages}
                className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
