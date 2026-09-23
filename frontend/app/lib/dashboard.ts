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

export interface RevenuePeriod {
  period: string;
  revenue: number;
}

export interface RevenueReport {
  currency: string;
  periodType: string;
  periods: RevenuePeriod[];
}

export interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  amountDue: number;
  status: string;
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  amountDue: number;
  status: string;
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

/** IG-224: account-owned revenue aggregation by period. periodType is "month", "quarter", or
 * "year". startDate/endDate (YYYY-MM-DD) scope the report - omit both for the backend's default
 * (current month). */
export async function getRevenueReport(
  periodType: string = "month",
  startDate?: string,
  endDate?: string
): Promise<RevenueReport> {
  const params = new URLSearchParams();
  params.set("periodType", periodType);
  if (startDate) {
    params.set("startDate", startDate);
  }
  if (endDate) {
    params.set("endDate", endDate);
  }
  const query = params.toString();
  const response = await fetch(`${baseUrl()}/api/v1/reports/revenue?${query}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load the revenue report."));
  }

  return response.json();
}

/** IG-225: Get invoices with outstanding balance (AmountDue > 0, not Cancelled). */
export async function getOutstandingReport(): Promise<OutstandingInvoice[]> {
  const response = await fetch(`${baseUrl()}/api/v1/reports/outstanding`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load outstanding invoices."));
  }

  return response.json();
}

/** IG-225: Get invoices that are both outstanding and overdue (past due date). */
export async function getOverdueReport(): Promise<OverdueInvoice[]> {
  const response = await fetch(`${baseUrl()}/api/v1/reports/overdue`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load overdue invoices."));
  }

  return response.json();
}
