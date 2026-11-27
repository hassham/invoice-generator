"use client";

import { formatDate } from "../../../dashboard/components/DashboardPresentation";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { computePeriodRange, PERIOD_PRESET_LABELS, type PeriodPreset } from "../../../dashboard/lib/period";
import { listCustomers, type Customer } from "../../../lib/customers";
import { Button } from "../../../components/ui/Button";
import { WorkspaceCollection, WorkspaceCreateLink, WorkspaceHeading, WorkspaceRecordName, WorkspaceRowButton, WorkspaceRowLink, WorkspaceState } from "../../../components/ui/WorkspaceCollection";
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

  const extraFilterCount = Number(Boolean(customerId)) + Number(datePreset !== "All");
  const [moreFilters, setMoreFilters] = useState(extraFilterCount > 0);
  const [searchInput, setSearchInput] = useState(search);
  const [state, setState] = useState<LoadState>("loading");
  const [result, setResult] = useState<InvoiceListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
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
  }, [page, pageSize, search, status, customerId, sort, datePreset, customStart, customEnd, retry]);

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
      <WorkspaceHeading area="invoice" eyebrow="Workspace / Billing" title="Invoices"
        description="Find a saved invoice, check its status, or start a new one."
        actions={<WorkspaceCreateLink href="/invoice/create">New invoice</WorkspaceCreateLink>} />

      <form onSubmit={handleSearchSubmit} className="collection-filters" aria-label="Invoice filters">
        <div className="collection-filter-field collection-filter-search">
            <label htmlFor="invoice-search" className="text-sm font-semibold text-ink">
              Search
            </label>
            <input
              id="invoice-search"
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Invoice number, reference or customer…"
              className="workspace-field rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            />
          </div>
          <Button type="submit" variant="secondary" className="collection-search">
            Search
          </Button>

          <div className="collection-filter-field">
            <label htmlFor="invoice-status-filter" className="text-sm font-semibold text-ink">
              Status
            </label>
            <select
              id="invoice-status-filter"
              value={status}
              onChange={(event) => navigate({ status: event.target.value || undefined, page: "1" })}
              className="workspace-field rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <option value="">All statuses</option>
              {INVOICE_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="collection-filter-field">
            <label htmlFor="invoice-sort" className="text-sm font-semibold text-ink">
              Sort
            </label>
            <select
              id="invoice-sort"
              value={sort}
              onChange={(event) => navigate({ sort: event.target.value === DEFAULT_SORT ? undefined : event.target.value })}
              className="workspace-field rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              {INVOICE_SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {INVOICE_SORT_OPTION_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        <div className="collection-filter-controls">
          <button type="button" className="workspace-button-secondary"
            aria-expanded={moreFilters} aria-controls="invoice-extra-filters"
            onClick={() => setMoreFilters((open) => !open)}>
            More filters{extraFilterCount > 0 ? " (" + extraFilterCount + ")" : ""}
            <span aria-hidden="true">{moreFilters ? "−" : "+"}</span>
          </button>
          {hasActiveFilters ? <button type="button" onClick={handleClearFilters} className="collection-clear">Clear filters</button> : null}
        </div>
        <div id="invoice-extra-filters" className="collection-extra-filters" hidden={!moreFilters}>
          <div className="collection-filter-field">
            <label htmlFor="invoice-customer-filter" className="text-sm font-semibold text-ink">
              Customer
            </label>
            <select
              id="invoice-customer-filter"
              value={customerId}
              onChange={(event) => navigate({ customerId: event.target.value || undefined, page: "1" })}
              className="workspace-field rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.businessName ?? customer.contactName ?? "(unnamed)"}
                </option>
              ))}
            </select>
          </div>

          <div className="collection-filter-field">
            <label htmlFor="invoice-date-filter" className="text-sm font-semibold text-ink">
              Date
            </label>
            <select
              id="invoice-date-filter"
              value={datePreset}
              onChange={(event) => navigate({ datePreset: event.target.value === "All" ? undefined : event.target.value, startDate: undefined, endDate: undefined, page: "1" })}
              className="workspace-field rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
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
              <div className="collection-filter-field">
                <label htmlFor="invoice-date-start" className="text-sm font-semibold text-ink">
                  From
                </label>
                <input
                  id="invoice-date-start"
                  type="date"
                  value={customStart}
                  onChange={(event) => navigate({ startDate: event.target.value || undefined, page: "1" })}
                  className="workspace-field rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                />
              </div>
              <div className="collection-filter-field">
                <label htmlFor="invoice-date-end" className="text-sm font-semibold text-ink">
                  To
                </label>
                <input
                  id="invoice-date-end"
                  type="date"
                  value={customEnd}
                  onChange={(event) => navigate({ endDate: event.target.value || undefined, page: "1" })}
                  className="workspace-field rounded-lg border border-border bg-paper px-2 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                />
              </div>
            </>
          ) : null}

        </div>
      </form>

      {state === "error" && error ? (
        <WorkspaceState area="invoice" kind="error"
          action={<WorkspaceRowButton onClick={() => setRetry((next) => next + 1)}>Try again</WorkspaceRowButton>}>{error}</WorkspaceState>
      ) : null}
      {state === "loading" ? <WorkspaceState area="invoice" kind="loading">Loading invoices&hellip;</WorkspaceState> : null}
      {state === "loaded" && result && result.items.length === 0 ? (
        <WorkspaceState area="invoice" kind="empty" action={!hasActiveFilters ? <WorkspaceRowLink href="/invoice/create">Create your first invoice</WorkspaceRowLink> : undefined}>
          <strong>{hasActiveFilters ? "No invoices match these criteria." : "No invoices yet."}</strong>
          <p className="text-muted">{hasActiveFilters ? "Try a different search or clear the filters." : "Your saved invoices will appear here."}</p>
        </WorkspaceState>
      ) : null}

      {state === "loaded" && result && result.items.length > 0 ? (
        <WorkspaceCollection area="invoice" title="Invoice register" caption="Invoices"
          note={result.totalCount + (result.totalCount === 1 ? " matching invoice" : " matching invoices")}
          rows={result.items} rowKey={(invoice) => invoice.id}
          columns={[
            { key: "number", label: "Invoice Number", render: (invoice) => <WorkspaceRecordName area="invoice"><span className="font-mono">{invoice.invoiceNumber}</span></WorkspaceRecordName> },
            { key: "customer", label: "Customer", render: (invoice) => invoice.customerName || "-" },
            { key: "issue", label: "Issue Date", render: (invoice) => <time dateTime={invoice.issueDate}>{formatDate(invoice.issueDate)}</time> },
            { key: "due", label: "Due Date", render: (invoice) => <time dateTime={invoice.dueDate}>{formatDate(invoice.dueDate)}</time> },
            { key: "amount", label: "Amount", align: "end", render: (invoice) => formatCurrency(invoice.totalAmount, invoice.currency) },
            { key: "due-amount", label: "Amount Due", align: "end", render: (invoice) => formatCurrency(invoice.amountDue, invoice.currency) },
            { key: "status", label: "Status", render: (invoice) => <StatusBadge tone={toneForInvoiceStatus(invoice.status)} label={invoice.status === "PartiallyPaid" ? "Partially paid" : invoice.status} /> },
            { key: "actions", label: "Actions", render: (invoice) => <WorkspaceRowLink href={"/documents/invoices/" + invoice.id}>View</WorkspaceRowLink> },
          ]}
          footer={
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <div className="flex items-center gap-2">
              <label htmlFor="invoice-page-size" className="font-medium">
                Per page
              </label>
              <select
                id="invoice-page-size"
                value={pageSize}
                onChange={(event) => navigate({ pageSize: event.target.value, page: "1" })}
                className="workspace-field rounded-lg border border-border bg-paper px-2 py-1 font-sans text-sm text-ink"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate({ page: String(page - 1) })}
                disabled={page <= 1}
                className="workspace-button-secondary"
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
                className="workspace-button-secondary"
              >
                Next
              </button>
            </div>
          </div>
          } />
      ) : null}
    </div>
  );
}
