import { apiBaseUrl } from "./business";

/** IG-242: client for the combined reports across every business the user can access. Each figure
 * carries its business; totals are per currency and never summed across currencies. */

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface CombinedRevenue {
  periodType: string;
  businesses: { businessId: string; businessName: string; currency: string; periods: { period: string; revenue: number }[]; total: number }[];
  totalsByCurrency: { currency: string; total: number }[];
}

export interface CombinedInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  dueDate: string;
  currency: string;
  amountDue: number;
  status: string;
}

export interface CombinedInvoiceList {
  businesses: { businessId: string; businessName: string; invoices: CombinedInvoice[] }[];
  amountDueByCurrency: CurrencyAmount[];
}

/** IG-242: customers are listed under the business they belong to. The same name in two businesses is two
 * customers, so they are not merged. */
export interface CombinedCustomers {
  businesses: { businessId: string; businessName: string; customers: { customerId: string; customerName: string; currency: string; revenue: number }[] }[];
  revenueByCurrency: CurrencyAmount[];
}

export interface CombinedTax {
  businesses: { businessId: string; businessName: string; summary: { currency: string; totalTaxableAmount: number; totalTaxCollected: number } }[];
  taxCollectedByCurrency: CurrencyAmount[];
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to load the combined reports.");
  }
  return response.json();
}

export function getCombinedRevenue(startDate: string, endDate: string): Promise<CombinedRevenue> {
  return getJson(`/api/v1/reports/combined/revenue?periodType=month&startDate=${startDate}&endDate=${endDate}`);
}

export function getCombinedOutstanding(): Promise<CombinedInvoiceList> {
  return getJson("/api/v1/reports/combined/outstanding");
}

export function getCombinedOverdue(): Promise<CombinedInvoiceList> {
  return getJson("/api/v1/reports/combined/overdue");
}

export function getCombinedCustomers(startDate: string, endDate: string): Promise<CombinedCustomers> {
  return getJson(`/api/v1/reports/combined/by-customer?startDate=${startDate}&endDate=${endDate}`);
}

export function getCombinedTax(startDate: string, endDate: string): Promise<CombinedTax> {
  return getJson(`/api/v1/reports/combined/tax-summary?startDate=${startDate}&endDate=${endDate}`);
}
