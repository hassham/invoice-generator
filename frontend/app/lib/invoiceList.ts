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

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-62: account-owned, same credentials:"include" convention as lib/auth.ts. FSD section 112:
 * pageSize defaults to 25 server-side for any missing/out-of-range value, 25/50/100 are just the
 * frontend's offered choices. */
export async function listInvoices(page: number, pageSize: number): Promise<InvoiceListResult> {
  const response = await fetch(`${baseUrl()}/api/v1/invoices?page=${page}&pageSize=${pageSize}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load invoices."));
  }

  return response.json();
}
