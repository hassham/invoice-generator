import type { TaxCalculationMethod } from "../invoice/create/lib/invoiceTotals";

export const PAYMENT_TERMS_OPTIONS = ["DueOnReceipt", "Net7", "Net14", "Net30", "Net60", "Net90", "Custom"] as const;
export type PaymentTermsOption = (typeof PAYMENT_TERMS_OPTIONS)[number];

export const PAYMENT_TERMS_LABELS: Record<PaymentTermsOption, string> = {
  DueOnReceipt: "Due on Receipt",
  Net7: "Net 7",
  Net14: "Net 14",
  Net30: "Net 30",
  Net60: "Net 60",
  Net90: "Net 90",
  Custom: "Custom",
};

export interface BusinessProfile {
  id: string;
  businessName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  registrationNumber: string | null;
  taxNumber: string | null;
  defaultCurrency: string;
  defaultTaxRate: number;
  taxCalculationMethod: TaxCalculationMethod;
  defaultPaymentTerms: PaymentTermsOption;
  defaultPaymentTermsDays: number | null;
  defaultInvoiceNotes: string | null;
  defaultTermsAndConditions: string | null;
  defaultTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfileRequest {
  businessName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  registrationNumber: string | null;
  taxNumber: string | null;
  defaultCurrency: string;
  defaultTaxRate: number;
  taxCalculationMethod: TaxCalculationMethod;
  defaultPaymentTerms: PaymentTermsOption;
  defaultPaymentTermsDays: number | null;
  defaultInvoiceNotes: string | null;
  defaultTermsAndConditions: string | null;
  defaultTemplateId: string | null;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-53: account-owned, same credentials:"include" convention as lib/customers.ts. Every account
 * has exactly one Business row (created at registration), so there's no id in the route. */
export async function getBusinessProfile(): Promise<BusinessProfile> {
  const response = await fetch(`${baseUrl()}/api/v1/business`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load your business profile."));
  }

  return response.json();
}

export async function updateBusinessProfile(request: BusinessProfileRequest): Promise<BusinessProfile> {
  const response = await fetch(`${baseUrl()}/api/v1/business`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to save your business profile."));
  }

  return response.json();
}
