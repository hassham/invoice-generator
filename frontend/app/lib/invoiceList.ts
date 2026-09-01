export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalAmount: number;
  amountDue: number;
}

export interface InvoiceListResult {
  items: InvoiceListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** FSD section 47's Status filter options - deliberately the 6 it lists, not every InvoiceStatus
 * value (it omits "Viewed"). */
export const INVOICE_STATUS_FILTER_OPTIONS = ["Draft", "Sent", "Paid", "PartiallyPaid", "Overdue", "Cancelled"] as const;
export type InvoiceStatusFilter = (typeof INVOICE_STATUS_FILTER_OPTIONS)[number];

/** FSD section 48's 5 sort options. */
export const INVOICE_SORT_OPTIONS = ["Newest", "Oldest", "AmountHighest", "AmountLowest", "DueDate"] as const;
export type InvoiceSortOption = (typeof INVOICE_SORT_OPTIONS)[number];

export const INVOICE_SORT_OPTION_LABELS: Record<InvoiceSortOption, string> = {
  Newest: "Newest",
  Oldest: "Oldest",
  AmountHighest: "Amount (Highest)",
  AmountLowest: "Amount (Lowest)",
  DueDate: "Due Date",
};

export interface InvoiceListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: InvoiceStatusFilter;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  sort?: InvoiceSortOption;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/**
 * IG-62/IG-63: account-owned, same credentials:"include" convention as lib/auth.ts. FSD section
 * 112: pageSize defaults to 25 server-side for any missing/out-of-range value, 25/50/100 are just
 * the frontend's offered choices. search/status/startDate/endDate/customerId/sort all combine
 * with AND server-side; omitting all of them (page/pageSize only) reproduces IG-62's original
 * unfiltered, newest-first behavior exactly.
 */
export async function listInvoices(params: InvoiceListParams): Promise<InvoiceListResult> {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize));
  if (params.search) {
    query.set("search", params.search);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.startDate) {
    query.set("startDate", params.startDate);
  }
  if (params.endDate) {
    query.set("endDate", params.endDate);
  }
  if (params.customerId) {
    query.set("customerId", params.customerId);
  }
  if (params.sort) {
    query.set("sort", params.sort);
  }

  const response = await fetch(`${baseUrl()}/api/v1/invoices?${query.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load invoices."));
  }

  return response.json();
}
