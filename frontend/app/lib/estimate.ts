import type { InvoiceDiscountType, TaxCalculationMethod } from "../invoice/create/lib/invoiceTotals";
import { createEmptyLineItem, toCalculationInput, type LineItem } from "../invoice/create/lib/lineItems";
import type { FieldValues } from "../invoice/create/lib/invoiceDraft";
import type { TemplateCustomization } from "../invoice/create/lib/templateCustomization";

export interface EstimateSaveLineItemPayload {
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface EstimateSavePaymentInstructionsPayload {
  bankName: string | null;
  accountName: string | null;
  bsb: string | null;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
  paymentReference: string | null;
}

/** Mirrors InvoiceSavePayload (frontend/app/invoice/create/lib/invoiceSave.ts) - same field
 * parity decision as the backend's EstimateSaveRequest (IG-220). */
export interface EstimateSavePayload {
  estimateNumber: string;
  issueDate: string;
  expiryDate: string;
  reference: string | null;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string | null;
  customerId: string | null;
  items: EstimateSaveLineItemPayload[];
  discountType: InvoiceDiscountType;
  discountValue: number | null;
  taxCalculationMethod: TaxCalculationMethod;
  notes: string | null;
  terms: string | null;
  customInstructions: string | null;
  paymentInstructions: EstimateSavePaymentInstructionsPayload | null;
  templateId: string | null;
  templateCustomization: TemplateCustomization | null;
}

export interface SavedEstimate {
  id: string;
  customerId: string;
  estimateNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  currency: string;
  reference: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateDetailLineItem {
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface EstimateDetail {
  id: string;
  customerId: string;
  estimateNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  reference: string | null;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string | null;
  items: EstimateDetailLineItem[];
  discountType: InvoiceDiscountType;
  discountValue: number | null;
  notes: string | null;
  terms: string | null;
  paymentInstructions: string | null;
  templateId: string | null;
  templateCustomization: TemplateCustomization | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors EditableInvoice (frontend/app/lib/invoiceDetail.ts) - the editable shape the shared
 * editor sub-components (FormField, TextAreaField, LineItemsSection) expect. */
export interface EditableEstimate {
  header: FieldValues;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string;
  lineItems: LineItem[];
  discountType: InvoiceDiscountType;
  discountValue: string;
  notes: string;
  terms: string;
  paymentInstructions: string;
  templateId: string;
  templateCustomization: TemplateCustomization;
}

function taxRateToPreset(taxRate: number): { taxRatePreset: LineItem["taxRatePreset"]; customTaxRate: string } {
  const presets: LineItem["taxRatePreset"][] = ["0", "5", "10", "15", "20"];
  const match = presets.find((preset) => Number(preset) === taxRate);
  return match ? { taxRatePreset: match, customTaxRate: "" } : { taxRatePreset: "custom", customTaxRate: String(taxRate) };
}

function toLineItem(item: EstimateDetailLineItem, index: number): LineItem {
  const { taxRatePreset, customTaxRate } = taxRateToPreset(item.taxRate);
  return {
    id: `existing-line-item-${index}`,
    description: item.description,
    quantity: String(item.quantity),
    unit: item.unit ?? "",
    unitPrice: String(item.unitPrice),
    taxRatePreset,
    customTaxRate,
    discount: String(item.discount),
  };
}

const DEFAULT_TEMPLATE_CUSTOMIZATION: TemplateCustomization = {
  primaryColor: "#0f172a",
  accentColor: "#0f172a",
  font: "Arial, Helvetica, sans-serif",
  headerStyle: "Banner",
};

/** The empty state for a brand-new estimate (nothing to load yet) - `header.invoiceNumber`/
 * `.dueDate` keys are the shared FieldValues names ESTIMATE_HEADER_FIELDS also uses, not renamed
 * for Estimate, so this round-trips through the same header section unchanged. */
export function createEmptyEditableEstimate(currency: string, issueDate: string, expiryDate: string): EditableEstimate {
  return {
    header: { invoiceNumber: "", issueDate, dueDate: expiryDate, reference: "" },
    currency,
    seller: "",
    customer: "",
    shipTo: "",
    lineItems: [createEmptyLineItem()],
    discountType: "None",
    discountValue: "",
    notes: "",
    terms: "",
    paymentInstructions: "",
    templateId: "",
    templateCustomization: DEFAULT_TEMPLATE_CUSTOMIZATION,
  };
}

export function toEditableEstimate(detail: EstimateDetail): EditableEstimate {
  return {
    header: {
      invoiceNumber: detail.estimateNumber,
      issueDate: detail.issueDate,
      dueDate: detail.expiryDate,
      reference: detail.reference ?? "",
    },
    currency: detail.currency,
    seller: detail.seller,
    customer: detail.customer,
    shipTo: detail.shipTo ?? "",
    lineItems: detail.items.length > 0 ? detail.items.map(toLineItem) : [createEmptyLineItem()],
    discountType: detail.discountType,
    discountValue: detail.discountValue !== null ? String(detail.discountValue) : "",
    notes: detail.notes ?? "",
    terms: detail.terms ?? "",
    paymentInstructions: detail.paymentInstructions ?? "",
    templateId: detail.templateId ?? "",
    templateCustomization: detail.templateCustomization ?? DEFAULT_TEMPLATE_CUSTOMIZATION,
  };
}

function nullIfEmpty(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

export function buildEstimateSavePayload(editable: EditableEstimate, selectedCustomerId: string | null = null): EstimateSavePayload {
  const parsedDiscountValue = editable.discountValue.trim().length > 0 ? Number.parseFloat(editable.discountValue) : null;

  return {
    estimateNumber: editable.header.invoiceNumber,
    issueDate: editable.header.issueDate,
    expiryDate: editable.header.dueDate,
    reference: nullIfEmpty(editable.header.reference),
    currency: editable.currency,
    seller: editable.seller,
    customer: editable.customer,
    shipTo: nullIfEmpty(editable.shipTo),
    customerId: selectedCustomerId,
    items: editable.lineItems.map((item) => {
      const numeric = toCalculationInput(item);
      return {
        description: item.description,
        quantity: numeric.quantity,
        unit: nullIfEmpty(item.unit),
        unitPrice: numeric.unitPrice,
        taxRate: numeric.taxRate,
        discount: numeric.discount,
      };
    }),
    discountType: editable.discountType,
    discountValue: Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : null,
    taxCalculationMethod: "Exclusive",
    notes: nullIfEmpty(editable.notes),
    terms: nullIfEmpty(editable.terms),
    customInstructions: nullIfEmpty(editable.paymentInstructions),
    paymentInstructions: null,
    templateId: nullIfEmpty(editable.templateId),
    templateCustomization: editable.templateCustomization,
  };
}

export interface EstimateListItem {
  id: string;
  estimateNumber: string;
  customerName: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  currency: string;
  totalAmount: number;
}

export interface EstimateListResponse {
  items: EstimateListItem[];
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

/** POSTs a new estimate (first save) - same credentials:"include" convention as lib/invoiceSave.ts. */
export async function createEstimate(payload: EstimateSavePayload): Promise<SavedEstimate> {
  const response = await fetch(`${baseUrl()}/api/v1/estimates`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to save this estimate."));
  }

  return response.json();
}

export async function updateEstimate(estimateId: string, payload: EstimateSavePayload): Promise<SavedEstimate> {
  const response = await fetch(`${baseUrl()}/api/v1/estimates/${estimateId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to save this estimate."));
  }

  return response.json();
}

export async function getEstimate(id: string): Promise<EstimateDetail> {
  const response = await fetch(`${baseUrl()}/api/v1/estimates/${id}`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load this estimate."));
  }

  return response.json();
}

export async function listEstimates(page = 1, pageSize = 25): Promise<EstimateListResponse> {
  const response = await fetch(`${baseUrl()}/api/v1/estimates?page=${page}&pageSize=${pageSize}`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load your estimates."));
  }

  return response.json();
}
