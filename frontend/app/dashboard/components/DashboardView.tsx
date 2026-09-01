"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDashboardSummary, type DashboardSummary } from "../../lib/dashboard";
import { computePeriodRange, PERIOD_PRESET_LABELS, PERIOD_PRESETS, type PeriodPreset } from "../lib/period";

type LoadState = "loading" | "loaded" | "error";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function resolveRange(preset: PeriodPreset, customStart: string, customEnd: string): { startDate?: string; endDate?: string } {
  if (preset === "Custom") {
    return customStart && customEnd ? { startDate: customStart, endDate: customEnd } : {};
  }
  return computePeriodRange(preset);
}

/**
 * FSD section 42 (/dashboard): financial summary cards + section 43's recent invoices widget +
 * section 44's empty state. If the account has no invoices at all (recentInvoices is unscoped by
 * period, so an empty list genuinely means "no invoices exist"), the FSD-specified empty state
 * replaces the summary cards/table entirely - four $0.00 cards next to an empty table isn't a
 * useful first-run experience. "Failure state does not display misleading totals" (IG-60's own AC)
 * is why a load error replaces the cards with an alert rather than falling back to showing zeros.
 */
export function DashboardView() {
  const [preset, setPreset] = useState<PeriodPreset>("ThisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = resolveRange(preset, customStart, customEnd);

  useEffect(() => {
    if (preset === "Custom" && (!range.startDate || !range.endDate)) {
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-sync with the selected period, same reasoning as InvoiceListView's page/pageSize re-fetch.
    setState("loading");
    getDashboardSummary(range.startDate, range.endDate)
      .then((loaded) => {
        if (!cancelled) {
          setSummary(loaded);
          setState("loaded");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load the dashboard.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- range is derived from preset/customStart/customEnd each render; depending on those three primitives directly avoids re-running on every render from a new range object identity.
  }, [preset, customStart, customEnd]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-950">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="dashboard-period" className="text-sm font-medium text-slate-700">
            Period
          </label>
          <select
            id="dashboard-period"
            value={preset}
            onChange={(event) => setPreset(event.target.value as PeriodPreset)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {PERIOD_PRESETS.map((option) => (
              <option key={option} value={option}>
                {PERIOD_PRESET_LABELS[option]}
              </option>
            ))}
          </select>
          {preset === "Custom" ? (
            <>
              <label htmlFor="dashboard-period-start" className="sr-only">
                Start date
              </label>
              <input
                id="dashboard-period-start"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <label htmlFor="dashboard-period-end" className="sr-only">
                End date
              </label>
              <input
                id="dashboard-period-end"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </>
          ) : null}
        </div>
      </div>

      {state === "loading" ? <p className="mt-6 text-sm text-slate-600">Loading dashboard…</p> : null}

      {state === "error" ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {state === "loaded" && summary && summary.recentInvoices.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">Create your first invoice.</p>
          <Link
            href="/invoice/create"
            className="mt-4 inline-block rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Create Invoice
          </Link>
        </div>
      ) : null}

      {state === "loaded" && summary && summary.recentInvoices.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Invoiced</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(summary.totalInvoiced, summary.currency)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Paid</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(summary.totalPaid, summary.currency)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Outstanding</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(summary.outstanding, summary.currency)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Overdue</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(summary.overdue, summary.currency)}</p>
            </div>
          </div>

          <h2 className="mt-8 text-lg font-semibold text-slate-950">Recent Invoices</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-medium">Invoice Number</th>
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Issue Date</th>
                  <th className="py-2 pr-4 font-medium">Due Date</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Amount Due</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentInvoices.map((invoice) => (
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
          <Link href="/documents/invoices" className="mt-4 inline-block text-sm font-medium text-slate-950 hover:underline">
            View all invoices
          </Link>
        </>
      ) : null}
    </div>
  );
}
