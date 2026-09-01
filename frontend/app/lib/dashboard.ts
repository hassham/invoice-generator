export interface DashboardRecentInvoice {
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

export interface DashboardSummary {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  currency: string;
  recentInvoices: DashboardRecentInvoice[];
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-60/IG-61: account-owned, same credentials:"include" convention as lib/auth.ts. startDate/
 * endDate (YYYY-MM-DD) scope Total Invoiced/Total Paid only - omit both for the backend's default
 * (current calendar month, FSD section 42). */
export async function getDashboardSummary(startDate?: string, endDate?: string): Promise<DashboardSummary> {
  const params = new URLSearchParams();
  if (startDate) {
    params.set("startDate", startDate);
  }
  if (endDate) {
    params.set("endDate", endDate);
  }
  const query = params.toString();
  const response = await fetch(`${baseUrl()}/api/v1/dashboard/summary${query ? `?${query}` : ""}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load the dashboard."));
  }

  return response.json();
}
