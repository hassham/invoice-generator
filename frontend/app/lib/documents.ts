/**
 * IG-237: the unified document list. Mirrors the backend's `DocumentSummaryDto` - five document
 * types collapsed into one row shape - and is deliberately separate from `lib/invoiceList.ts`,
 * which still backs the invoice-only list and is unchanged.
 */
export const DOCUMENT_TYPES = [
  "Invoice",
  "Estimate",
  "CreditNote",
  "Receipt",
  "PurchaseOrder",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** The enum values are sent on the wire; these are what a person reads. */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  Invoice: "Invoice",
  Estimate: "Estimate",
  CreditNote: "Credit Note",
  Receipt: "Receipt",
  PurchaseOrder: "Purchase Order",
};

export const DOCUMENT_SORT_OPTIONS = ["Newest", "Oldest", "AmountHighest", "AmountLowest"] as const;
export type DocumentSortOption = (typeof DOCUMENT_SORT_OPTIONS)[number];

export const DOCUMENT_SORT_OPTION_LABELS: Record<DocumentSortOption, string> = {
  Newest: "Newest first",
  Oldest: "Oldest first",
  AmountHighest: "Highest amount",
  AmountLowest: "Lowest amount",
};

export interface DocumentSummary {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  partyName: string;
  issueDate: string;
  currency: string;
  totalAmount: number;
  status: string | null;
}

export interface DocumentListResult {
  items: DocumentSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface DocumentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  documentType?: DocumentType;
  startDate?: string;
  endDate?: string;
  sort?: DocumentSortOption;
}

/**
 * Where a row goes when clicked. Credit notes and receipts have no detail page of their own yet,
 * so they land on their own list rather than a dead link - the one place this list cannot take you
 * straight to the document itself.
 */
export function documentHref(document: DocumentSummary): string {
  switch (document.documentType) {
    case "Invoice":
      return `/documents/invoices/${document.id}`;
    case "Estimate":
      return `/documents/estimates/${document.id}`;
    case "PurchaseOrder":
      return `/documents/purchase-orders/${document.id}`;
    case "CreditNote":
      return "/credit-notes";
    case "Receipt":
      return "/receipts";
  }
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

export async function listDocuments(params: DocumentListParams = {}): Promise<DocumentListResult> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }

  const response = await fetch(`${baseUrl()}/api/v1/documents?${query.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? "Failed to load your documents.");
  }

  return response.json();
}
