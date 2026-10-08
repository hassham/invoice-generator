"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { computePeriodRange, PERIOD_PRESET_LABELS, type PeriodPreset } from "../../dashboard/lib/period";
import {
  DOCUMENT_SORT_OPTIONS,
  DOCUMENT_SORT_OPTION_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  documentHref,
  listDocuments,
  type DocumentListResult,
  type DocumentSortOption,
  type DocumentType,
} from "../../lib/documents";

type LoadState = "loading" | "loaded" | "error";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
const DATE_PRESETS = ["All", "ThisMonth", "LastMonth", "ThisQuarter", "ThisYear"] as const;
type DatePreset = (typeof DATE_PRESETS)[number];
const DEFAULT_SORT: DocumentSortOption = "Newest";

/** Each type gets its own tint so a row's kind registers before the number is read. Purchase
 * orders keep the amber they already use on their own list and detail pages (IG-292). */
const TYPE_BADGE_CLASSES: Record<DocumentType, string> = {
  Invoice: "bg-sky-100 text-sky-900",
  Estimate: "bg-violet-100 text-violet-900",
  CreditNote: "bg-rose-100 text-rose-900",
  Receipt: "bg-emerald-100 text-emerald-900",
  PurchaseOrder: "bg-amber-100 text-amber-900",
};

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

function parseDocumentType(value: string | null): DocumentType | "" {
  return (DOCUMENT_TYPES as readonly string[]).includes(value ?? "") ? (value as DocumentType) : "";
}

function resolveDateRange(preset: DatePreset): { startDate?: string; endDate?: string } {
  return preset === "All" ? {} : computePeriodRange(preset as Exclude<PeriodPreset, "Custom">);
}

/**
 * IG-237: one list across every document type, so the per-type lists stop being the only way to
 * see what exists. Filter criteria live in the URL query string, same convention as the
 * invoice-only list (IG-63), so a filtered view survives a refresh or a shared link.
 *
 * This sits alongside `/documents/invoices` rather than replacing it - that list has invoice-only
 * concepts (status, customer, amount due) this one deliberately does not try to generalise across
 * five document types.
 */
export function DocumentListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const search = searchParams.get("search") ?? "";
  const documentType = parseDocumentType(searchParams.get("documentType"));
  const sort = (searchParams.get("sort") as DocumentSortOption | null) ?? DEFAULT_SORT;
  const datePreset = (searchParams.get("datePreset") as DatePreset | null) ?? "All";

  const [searchInput, setSearchInput] = useState(search);
  const [state, setState] = useState<LoadState>("loading");
  const [result, setResult] = useState<DocumentListResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Re-syncs the controlled search box when the URL changes from outside the search form
    // (Clear filters, browser back/forward) - same reasoning as InvoiceListView.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(search);
  }, [search]);

  const hasActiveFilters = Boolean(search || documentType || datePreset !== "All" || sort !== DEFAULT_SORT);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("loading");
    listDocuments({
      page,
      pageSize,
      search: search || undefined,
      documentType: documentType || undefined,
      sort,
      ...resolveDateRange(datePreset),
    })
      .then((loaded) => {
        if (!cancelled) {
          setResult(loaded);
          setState("loaded");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load your documents.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, documentType, sort, datePreset]);

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    return `/documents?${next.toString()}`;
  };

  const navigate = (overrides: Record<string, string | undefined>) => router.push(buildUrl(overrides));

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({ search: searchInput.trim() || undefined, page: "1" });
  };

  const handleClearFilters = () => router.push(`/documents?page=1&pageSize=${pageSize}`);

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-950">Documents</h1>
        {hasActiveFilters ? (
          <button type="button" onClick={handleClearFilters} className="text-sm font-medium text-slate-600 hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Everything you have issued or received — invoices, estimates, credit notes, receipts and
        purchase orders — in one place.
      </p>

      <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="document-search" className="text-sm font-medium text-slate-700">
            Search
          </label>
          <input
            id="document-search"
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Document number or name…"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
        </div>
        <button type="submit" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
          Search
        </button>

        <div className="flex flex-col gap-1">
          <label htmlFor="document-type-filter" className="text-sm font-medium text-slate-700">
            Document type
          </label>
          <select
            id="document-type-filter"
            value={documentType}
            onChange={(event) => navigate({ documentType: event.target.value || undefined, page: "1" })}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">All types</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="document-date-filter" className="text-sm font-medium text-slate-700">
            Date
          </label>
          <select
            id="document-date-filter"
            value={datePreset}
            onChange={(event) => navigate({ datePreset: event.target.value === "All" ? undefined : event.target.value, page: "1" })}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="All">All time</option>
            {DATE_PRESETS.filter((preset) => preset !== "All").map((preset) => (
              <option key={preset} value={preset}>
                {PERIOD_PRESET_LABELS[preset as PeriodPreset]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="document-sort" className="text-sm font-medium text-slate-700">
            Sort
          </label>
          <select
            id="document-sort"
            value={sort}
            onChange={(event) => navigate({ sort: event.target.value === DEFAULT_SORT ? undefined : event.target.value })}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            {DOCUMENT_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {DOCUMENT_SORT_OPTION_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </form>

      {state === "error" ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {state === "loading" ? <p className="mt-6 text-sm text-slate-600">Loading documents…</p> : null}

      {state === "loaded" && result && result.items.length === 0 && !hasActiveFilters ? (
        <p className="mt-6 text-sm text-slate-600">
          No documents yet.{" "}
          <Link href="/invoice/create" className="font-medium text-slate-950 hover:underline">
            Create your first invoice
          </Link>
          .
        </p>
      ) : null}

      {state === "loaded" && result && result.items.length === 0 && hasActiveFilters ? (
        <p className="mt-6 text-sm text-slate-600">
          No documents match these criteria.{" "}
          <button type="button" onClick={handleClearFilters} className="font-medium text-slate-950 hover:underline">
            Clear filters
          </button>
          .
        </p>
      ) : null}

      {state === "loaded" && result && result.items.length > 0 ? (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">All documents</caption>
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Number</th>
                  {/* Neutral on purpose: a purchase order's counterparty is a supplier, every
                      other type's is a customer. */}
                  <th className="py-2 pr-4 font-medium">Customer / Supplier</th>
                  <th className="py-2 pr-4 font-medium">Issue date</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={`${item.documentType}-${item.id}`} className="border-b border-slate-100">
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TYPE_BADGE_CLASSES[item.documentType]}`}>
                        {DOCUMENT_TYPE_LABELS[item.documentType]}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <Link href={documentHref(item)} className="font-medium text-slate-950 hover:underline">
                        {item.documentNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-700">{item.partyName || "—"}</td>
                    <td className="py-2 pr-4 text-slate-700">{item.issueDate}</td>
                    <td className="py-2 pr-4 text-slate-700">{formatCurrency(item.totalAmount, item.currency)}</td>
                    <td className="py-2 pr-4 text-slate-700">
                      {item.status ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <label htmlFor="document-page-size" className="font-medium">
                Per page
              </label>
              <select
                id="document-page-size"
                value={pageSize}
                onChange={(event) => navigate({ pageSize: event.target.value, page: "1" })}
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
                onClick={() => navigate({ page: String(page - 1) })}
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
                onClick={() => navigate({ page: String(page + 1) })}
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
