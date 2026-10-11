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

const PAYMENT_TERMS_DAYS: Record<Exclude<PaymentTermsOption, "Custom">, number> = {
  DueOnReceipt: 0,
  Net7: 7,
  Net14: 14,
  Net30: 30,
  Net60: 60,
  Net90: 90,
};

/** IG-51: the day count a business default's payment terms imply, for deriving a new invoice's
 * Due Date from its Issue Date. */
export function paymentTermsToDays(terms: PaymentTermsOption, customDays: number | null): number {
  return terms === "Custom" ? (customDays ?? 0) : PAYMENT_TERMS_DAYS[terms];
}

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
  invoicePrefix: string;
  nextInvoiceNumber: number;
  invoiceNumberPadding: number;
  logoUrl: string | null;
  /** IG-219: null means no Stripe account is connected - also what IG-216's hosted-invoice Pay
   * Now button will key off of. */
  stripeAccountId: string | null;
  /** IG-295: this business's own bank details, shown on its invoices. */
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankRoutingCode?: string | null;
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
  invoicePrefix: string;
  nextInvoiceNumber: number;
  invoiceNumberPadding: number;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankRoutingCode?: string | null;
}

export interface CreateBusinessRequest {
  businessName: string;
  country: string;
  defaultCurrency: string;
  taxCalculationMethod?: TaxCalculationMethod;
  defaultTaxRate?: number;
  defaultPaymentTerms?: PaymentTermsOption;
  defaultPaymentTermsDays?: number | null;
  invoicePrefix?: string;
  invoiceNumberPadding?: number;
  estimatePrefix?: string;
  estimateNumberPadding?: number;
}

export interface GeneratedInvoiceNumber {
  invoiceNumber: string;
}

export interface GeneratedEstimateNumber {
  estimateNumber: string;
}

/** FSD section 64: mirrors the backend's own formatting exactly (prefix + next number zero-padded)
 * - used for the settings page's live preview, purely client-side, no request needed. */
export function formatInvoiceNumberPreview(prefix: string, nextNumber: number, padding: number): string {
  const safeNumber = Number.isFinite(nextNumber) && nextNumber > 0 ? Math.trunc(nextNumber) : 0;
  const safePadding = Number.isFinite(padding) && padding > 0 ? Math.trunc(padding) : 1;
  return `${prefix}${String(safeNumber).padStart(safePadding, "0")}`;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-295: lists all businesses owned by the user. */
export async function listBusinesses(): Promise<BusinessProfile[]> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load your businesses."));
  }

  return response.json();
}

/** IG-295: creates a new business under the current account. */
export async function createBusiness(request: CreateBusinessRequest): Promise<BusinessProfile> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to create your business."));
  }

  return response.json();
}

/** IG-295: gets a specific business by id (must be owned by the user). */
export async function getBusinessProfileById(businessId: string): Promise<BusinessProfile> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load your business profile."));
  }

  return response.json();
}

/** IG-53: account-owned, same credentials:"include" convention as lib/customers.ts. Returns the
 * user's default/first business for backward compatibility. */
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

/** IG-295: updates a specific business by id (must be owned by the user). */
export async function updateBusinessProfileById(
  businessId: string,
  request: BusinessProfileRequest
): Promise<BusinessProfile> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}`, {
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

/** IG-54: has a server-side side effect (increments NextInvoiceNumber) - not idempotent, so this
 * should only be called once per invoice-creation pre-fill, not speculatively. */
export async function generateNextInvoiceNumber(): Promise<GeneratedInvoiceNumber> {
  const response = await fetch(`${baseUrl()}/api/v1/business/next-invoice-number`, { method: "POST", credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to generate the next invoice number."));
  }

  return response.json();
}

/** IG-220: same "has a server-side side effect, don't call speculatively" reasoning as
 * generateNextInvoiceNumber - a completely independent sequence, never shared with invoices. */
export async function generateNextEstimateNumber(): Promise<GeneratedEstimateNumber> {
  const response = await fetch(`${baseUrl()}/api/v1/business/next-estimate-number`, { method: "POST", credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to generate the next estimate number."));
  }

  return response.json();
}

/** IG-52: sends the raw file as-is - resizing/validation already happened client-side
 * (lib/logoUpload.ts) before this is called, and the server repeats the same checks itself
 * (defense in depth), so nothing here needs to duplicate that logic. */
export async function uploadBusinessLogo(businessId: string, file: Blob, fileName: string): Promise<BusinessProfile> {
  const formData = new FormData();
  formData.append("file", file, fileName);

  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/logo`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to upload your logo."));
  }

  return response.json();
}

export async function removeBusinessLogo(businessId: string): Promise<BusinessProfile> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/logo`, { method: "DELETE", credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to remove your logo."));
  }

  return response.json();
}

/** Resolves a LogoUrl (a relative API path, e.g. "/api/v1/business/logo/{id}") against the API's
 * own base URL, the same convention every other request in this module already uses. */
export function resolveLogoUrl(logoUrl: string): string {
  return `${baseUrl()}${logoUrl}`;
}

/**
 * IG-219: a real full-page navigation target (an <a href>, never a fetch call) - same reasoning
 * lib/auth.ts's googleLoginUrl() documents for the same shape of endpoint: GET
 * /api/v1/business/stripe/connect issues a 302 redirect straight to Stripe's own consent screen,
 * which only works as a genuine browser navigation (it also needs to set a same-origin cookie
 * that a fetch response wouldn't get the browser to carry through the redirect the same way).
 */
export function stripeConnectUrl(businessId: string): string {
  return `${baseUrl()}/api/v1/businesses/${businessId}/stripe/connect`;
}

export async function disconnectStripe(businessId: string): Promise<BusinessProfile> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/stripe/disconnect`, { method: "POST", credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to disconnect Stripe."));
  }

  return response.json();
}

/** The localStorage key BusinessContext persists the user's chosen business under (IG-295). */
export const SELECTED_BUSINESS_STORAGE_KEY = "selectedBusinessId";

/** IG-296: the business the user picked on /businesses, or null when nothing has been picked. */
/** IG-296: forgets the stored selection, so the next session starts from the account default. */
export function clearSelectedBusinessId(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(SELECTED_BUSINESS_STORAGE_KEY);
  } catch {
    // Storage can be blocked; there is nothing to clear in that case.
  }
}

export function readSelectedBusinessId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(SELECTED_BUSINESS_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** IG-296: the business every business-scoped request is made against - the one the user picked,
 * or the account's first (default) business when none has been picked yet. */
export async function getActiveBusinessId(): Promise<string> {
  const selected = readSelectedBusinessId();
  if (selected) {
    return selected;
  }

  const response = await fetch(`${baseUrl()}/api/v1/business`, { credentials: "include" });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load your business."));
  }

  const profile: BusinessProfile = await response.json();
  return profile.id;
}

/** IG-296: a business-scoped API URL, e.g. businessRoute("/invoices") resolves to
 * /api/v1/businesses/{activeBusinessId}/invoices. */
export async function businessRoute(path: string): Promise<string> {
  return `${baseUrl()}/api/v1/businesses/${await getActiveBusinessId()}${path}`;
}

/** IG-296: the API base for the active business, e.g. ${base}/api/v1/businesses/{id}, for URLs
 * built from nested template literals where businessRoute's single-path form doesn't fit. */
export async function businessApiBase(): Promise<string> {
  return `${baseUrl()}/api/v1/businesses/${await getActiveBusinessId()}`;
}
