"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDashboardSummary, type DashboardSummary } from "../../lib/dashboard";
import { computePeriodRange, PERIOD_PRESET_LABELS, PERIOD_PRESETS, type PeriodPreset } from "../lib/period";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { StatusBadge, toneForInvoiceStatus } from "../../components/ui/StatusBadge";

type LoadState = "loading" | "loaded" | "error";

// Workspace styling stays quieter than marketing. Use colour to distinguish status, not every total.
const primaryLink =
  "inline-flex items-center rounded-full border-[1.5px] border-ink bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#c4ee1a]";
const selectClass = "rounded-lg border border-border bg-paper px-2 py-1 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

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
    <div className="font-sans text-ink">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-5">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div>
            <p className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-muted">Workspace / Overview</p>
            <h1 className="font-display text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted">Your business at a glance.</p>
          </div>
          <Link href="/invoice/create" className={primaryLink}>
            New invoice
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="dashboard-period" className="text-sm font-semibold">
            Period
          </label>
          <select id="dashboard-period" value={preset} onChange={(event) => setPreset(event.target.value as PeriodPreset)} className={selectClass}>
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
                className={selectClass}
              />
              <label htmlFor="dashboard-period-end" className="sr-only">
                End date
              </label>
              <input
                id="dashboard-period-end"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className={selectClass}
              />
            </>
          ) : null}
        </div>
      </div>

      {state === "loading" ? <p className="mt-6 text-sm text-muted">Loading dashboard…</p> : null}

      {state === "error" ? (
        <p role="alert" className="mt-6 rounded-xl border border-ink bg-pink px-4 py-3 text-sm font-semibold text-[#991b1b]">
          {error}
        </p>
      ) : null}

      {state === "loaded" && summary && summary.recentInvoices.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <svg aria-hidden="true" viewBox="0 0 60 58" fill="none" className="mx-auto mb-3 size-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5h30v45H12z" className="fill-lavender" /><path d="M20 15h14m-14 8h14m-14 8h8" /><circle cx="43" cy="42" r="12" className="fill-paper" /><path d="M43 37v10m-5-5h10" />
          </svg>
          <h2 className="font-display text-2xl font-bold">Create your first invoice.</h2>
          <p className="mt-2 text-sm text-muted">Add a client and their line items. We’ll take care of the maths.</p>
          <Link href="/invoice/create" className={`${primaryLink} mt-4`}>
            Create Invoice
          </Link>
        </Card>
      ) : null}

      {state === "loaded" && summary && summary.recentInvoices.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="min-w-0 p-3 sm:p-4">
              <p className="text-sm font-semibold">Total Invoiced</p>
              <p className="mt-1 break-words font-mono text-base font-bold tabular-nums sm:text-xl">{formatCurrency(summary.totalInvoiced, summary.currency)}</p>
            </Card>
            <Card className="min-w-0 p-3 sm:p-4">
              <p className="text-sm font-semibold">Total Paid</p>
              <p className="mt-1 break-words font-mono text-base font-bold tabular-nums sm:text-xl">{formatCurrency(summary.totalPaid, summary.currency)}</p>
            </Card>
            <Card className="min-w-0 p-3 sm:p-4">
              <p className="text-sm font-semibold">Outstanding</p>
              <p className="mt-1 break-words font-mono text-base font-bold tabular-nums sm:text-xl">{formatCurrency(summary.outstanding, summary.currency)}</p>
            </Card>
            <Card tone={summary.overdue > 0 ? "pink" : "paper"} className="min-w-0 p-3 sm:p-4">
              <p className="text-sm font-semibold">Overdue</p>
              <p className="mt-1 break-words font-mono text-base font-bold tabular-nums sm:text-xl">{formatCurrency(summary.overdue, summary.currency)}</p>
            </Card>
          </div>

          <section aria-labelledby="dashboard-attention" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-paper p-4 sm:p-5">
            <div>
              <h2 id="dashboard-attention" className="font-display text-lg font-bold">Needs attention</h2>
              <p className="mt-1 text-sm text-muted">
                {summary.overdue > 0 ? `${formatCurrency(summary.overdue, summary.currency)} overdue in this period.` : "No overdue balance in this period."}
              </p>
            </div>
            {summary.overdue > 0 ? <Link className="text-sm font-semibold underline underline-offset-4" href="/reports/overdue">Review overdue invoices</Link> : null}
          </section>

          <h2 className="mt-8 font-display text-xl font-bold">Recent Invoices</h2>
          <DataTable
            className="mt-4"
            caption="Recent invoices"
            columns={[
              { key: "number", header: "Invoice Number", render: (invoice) => <span className="font-semibold">{invoice.invoiceNumber}</span> },
              { key: "customer", header: "Customer", render: (invoice) => invoice.customerName || "—" },
              { key: "issue", header: "Issue Date", render: (invoice) => invoice.issueDate },
              { key: "due", header: "Due Date", render: (invoice) => invoice.dueDate },
              { key: "amount", header: "Amount", align: "right", render: (invoice) => formatCurrency(invoice.totalAmount, invoice.currency) },
              { key: "due-amount", header: "Amount Due", align: "right", render: (invoice) => formatCurrency(invoice.amountDue, invoice.currency) },
              { key: "status", header: "Status", render: (invoice) => <StatusBadge tone={toneForInvoiceStatus(invoice.status)} label={invoice.status === "PartiallyPaid" ? "Partially paid" : invoice.status} /> },
              {
                key: "actions",
                header: "Actions",
                render: (invoice) => (
                  <Link href={`/documents/invoices/${invoice.id}`} className="font-semibold underline-offset-4 hover:underline">
                    View
                  </Link>
                ),
              },
            ]}
            rows={summary.recentInvoices}
            getRowKey={(invoice) => invoice.id}
          />
          <Link href="/documents/invoices" className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline">
            View all invoices
          </Link>
        </>
      ) : null}
    </div>
  );
}
