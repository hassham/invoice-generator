"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { computePeriodRange, PERIOD_PRESET_LABELS, type PeriodPreset } from "../../../dashboard/lib/period";
import { listCustomers, type Customer } from "../../../lib/customers";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { StatusBadge, toneForInvoiceStatus } from "../../../components/ui/StatusBadge";
import {
  INVOICE_SORT_OPTIONS,
  INVOICE_SORT_OPTION_LABELS,
  INVOICE_STATUS_FILTER_OPTIONS,
  listInvoices,
  type InvoiceListResult,
  type InvoiceSortOption,
  type InvoiceStatusFilter,
} from "../../../lib/invoiceList";

type LoadState = "loading" | "loaded" | "error";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
const DATE_PRESETS = ["All", "ThisMonth", "LastMonth", "ThisQuarter", "ThisYear", "Custom"] as const;
type DatePreset = (typeof DATE_PRESETS)[number];
const DEFAULT_SORT: InvoiceSortOption = "Newest";

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

function resolveDateRange(preset: DatePreset, customStart: string, customEnd: string): { startDate?: string; endDate?: string } {
  if (preset === "All") {
    return {};
  }
  if (preset === "Custom") {
    return customStart && customEnd ? { startDate: customStart, endDate: customEnd } : {};
  }
  return computePeriodRange(preset as Exclude<PeriodPreset, "Custom">);
}

/**
 * FSD sections 45-48 (/documents/invoices): the list itself, search, filters and sorting, all in
 * one page/component - IG-63 extends IG-62's original list rather than introducing a parallel
 * one. Row actions here are just "View" (links to IG-47's detail page, which already covers Edit)
 * - Duplicate/Download/Mark Paid/Cancel/Delete are FSD's fuller row-actions narrative, not this
 * Story's own AC, and none of those operations exist yet anyway. Every criterion (page, pageSize,
 * search, status, date preset/custom range, customer, sort) lives in the URL query string so the
 * active view survives a refresh or a shared link (FSD section 112 / this Story's own "retains
 * the active view state" precedent from IG-62) - "Clear filters" just navigates back to the bare
 * page/pageSize URL.
 */
export function InvoiceListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") as InvoiceStatusFilter | null) ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const sort = (searchParams.get("sort") as InvoiceSortOption | null) ?? DEFAULT_SORT;
  const datePreset = (searchParams.get("datePreset") as DatePreset | null) ?? "All";
  const customStart = searchParams.get("startDate") ?? "";
  const customEnd = searchParams.get("endDate") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [state, setState] = useState<LoadState>("loading");
  const [result, setResult] = useState<InvoiceListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    // Re-syncs the controlled search box with the URL whenever it changes from outside the
    // search form itself (Clear filters, browser back/forward) - without this the box would show
    // stale text after the URL's own search param has already changed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    listCustomers()
      .then((loaded) => {
        if (!cancelled) {
          setCustomers(loaded);
        }
      })
      .catch(() => {
        // The customer filter dropdown just stays empty - not worth failing the whole page over.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dateRange = resolveDateRange(datePreset, customStart, customEnd);
  const hasActiveFilters = Boolean(search || status || customerId || datePreset !== "All" || sort !== DEFAULT_SORT);

  useEffect(() => {
    let cancelled = false;
    // Resets to "loading" on every criteria change (not just the first render, which already
    // starts "loading" via useState's initial value) - legitimate re-sync with the URL params
    // driving this fetch, not the "derive state from props" anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("loading");
    listInvoices({ page, pageSize, search: search || undefined, status: status || undefined, customerId: customerId || undefined, sort, ...dateRange })
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
    // dateRange is derived fresh from datePreset/customStart/customEnd every render - depending on
    // those three primitives directly (already in the array) avoids re-running from a new object
    // identity alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, status, customerId, sort, datePreset, customStart, customEnd]);

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    return `/documents/invoices?${next.toString()}`;
  };

  const navigate = (overrides: Record<string, string | undefined>) => router.push(buildUrl(overrides));

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({ search: searchInput.trim() || undefined, page: "1" });
  };

  const handleClearFilters = () => {
    router.push(`/documents/invoices?page=1&pageSize=${pageSize}`);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Invoices</h1>
          <Link
            href="/invoice/create"
            className="rounded-full border-[1.5px] border-ink bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#c4ee1a]"
          >
            New invoice
          </Link>
        </div>
        {hasActiveFilters ? (
          <button type="button" onClick={handleClearFilters} className="text-sm font-medium text-muted hover:text-ink hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-search" className="text-sm font-semibold text-ink">
            Search
          </label>
          <input
            id="invoice-search"
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Invoice number, reference or customer…"
            className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>

        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-status-filter" className="text-sm font-semibold text-ink">
            Status
          </label>
          <select
            id="invoice-status-filter"
            value={status}
            onChange={(event) => navigate({ status: event.target.value || undefined, page: "1" })}
            className="rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <option value="">All statuses</option>
            {INVOICE_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-customer-filter" className="text-sm font-semibold text-ink">
            Customer
          </label>
          <select
            id="invoice-customer-filter"
            value={customerId}
            onChange={(event) => navigate({ customerId: event.target.value || undefined, page: "1" })}
            className="rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <option value="">All customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.businessName ?? customer.contactName ?? "(unnamed)"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-date-filter" className="text-sm font-semibold text-ink">
            Date
          </label>
          <select
            id="invoice-date-filter"
            value={datePreset}
            onChange={(event) => navigate({ datePreset: event.target.value === "All" ? undefined : event.target.value, startDate: undefined, endDate: undefined, page: "1" })}
            className="rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <option value="All">All time</option>
            {DATE_PRESETS.filter((preset) => preset !== "All").map((preset) => (
              <option key={preset} value={preset}>
                {preset === "Custom" ? "Custom" : PERIOD_PRESET_LABELS[preset as PeriodPreset]}
              </option>
            ))}
          </select>
        </div>

        {datePreset === "Custom" ? (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="invoice-date-start" className="text-sm font-semibold text-ink">
                From
              </label>
              <input
                id="invoice-date-start"
                type="date"
                value={customStart}
                onChange={(event) => navigate({ startDate: event.target.value || undefined, page: "1" })}
                className="rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="invoice-date-end" className="text-sm font-semibold text-ink">
                To
              </label>
              <input
                id="invoice-date-end"
                type="date"
                value={customEnd}
                onChange={(event) => navigate({ endDate: event.target.value || undefined, page: "1" })}
                className="rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>
          </>
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-sort" className="text-sm font-semibold text-ink">
            Sort
          </label>
          <select
            id="invoice-sort"
            value={sort}
            onChange={(event) => navigate({ sort: event.target.value === DEFAULT_SORT ? undefined : event.target.value })}
            className="rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {INVOICE_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {INVOICE_SORT_OPTION_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl border border-ink bg-pink px-4 py-3 text-sm font-semibold text-[#991b1b]">
          {error}
        </p>
      ) : null}

      {state === "loading" ? <p className="mt-6 text-sm text-muted">Loading invoices…</p> : null}

      {state === "loaded" && result && result.items.length === 0 && !hasActiveFilters ? (
        <p className="mt-6 text-sm text-muted">
          No invoices yet.{" "}
          <Link href="/invoice/create" className="font-semibold text-ink underline-offset-4 hover:underline">
            Create your first invoice
          </Link>
          .
        </p>
      ) : null}

      {state === "loaded" && result && result.items.length === 0 && hasActiveFilters ? (
        <p className="mt-6 text-sm text-muted">
          No invoices match these criteria.{" "}
          <button type="button" onClick={handleClearFilters} className="font-semibold text-ink underline-offset-4 hover:underline">
            Clear filters
          </button>
          .
        </p>
      ) : null}

      {state === "loaded" && result && result.items.length > 0 ? (
        <>
          <DataTable
            className="mt-6"
            caption="Invoices"
            columns={[
              { key: "number", header: "Invoice Number", render: (invoice) => <span className="font-semibold">{invoice.invoiceNumber}</span> },
              { key: "customer", header: "Customer", render: (invoice) => invoice.customerName || "—" },
              { key: "issue", header: "Date", render: (invoice) => invoice.issueDate },
              { key: "due", header: "Due Date", render: (invoice) => invoice.dueDate },
              { key: "amount", header: "Amount", align: "right", render: (invoice) => formatCurrency(invoice.totalAmount, invoice.currency) },
              { key: "due-amount", header: "Amount Due", align: "right", render: (invoice) => formatCurrency(invoice.amountDue, invoice.currency) },
              { key: "status", header: "Status", render: (invoice) => <StatusBadge tone={toneForInvoiceStatus(invoice.status)} label={invoice.status} /> },
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
            rows={result.items}
            getRowKey={(invoice) => invoice.id}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <div className="flex items-center gap-2">
              <label htmlFor="invoice-page-size" className="font-medium">
                Per page
              </label>
              <select
                id="invoice-page-size"
                value={pageSize}
                onChange={(event) => navigate({ pageSize: event.target.value, page: "1" })}
                className="rounded-lg border border-border bg-paper px-2 py-1 font-sans text-sm text-ink"
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
                onClick={() => navigate({ page: String(page - 1) })}
                disabled={page <= 1}
                className="rounded-full border-[1.5px] border-ink bg-paper px-4 py-2 font-semibold text-ink hover:bg-canvas disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => navigate({ page: String(page + 1) })}
                disabled={page >= totalPages}
                className="rounded-full border-[1.5px] border-ink bg-paper px-4 py-2 font-semibold text-ink hover:bg-canvas disabled:opacity-50"
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
