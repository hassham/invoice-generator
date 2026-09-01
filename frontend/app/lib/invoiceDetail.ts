import type { InvoiceSavePayload } from "../invoice/create/lib/invoiceSave";
import type { FieldValues } from "../invoice/create/lib/invoiceDraft";
import { createEmptyLineItem, toCalculationInput, type LineItem } from "../invoice/create/lib/lineItems";
import type { InvoiceDiscountType } from "../invoice/create/lib/invoiceTotals";
import type { TemplateCustomization } from "../invoice/create/lib/templateCustomization";

export interface InvoiceDetailLineItem {
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface InvoiceDetail {
  id: string;
  customerId: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  reference: string | null;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string | null;
  items: InvoiceDetailLineItem[];
  invoiceDiscountType: InvoiceDiscountType;
  invoiceDiscountValue: number | null;
  notes: string | null;
  terms: string | null;
  paymentInstructions: string | null;
  templateId: string | null;
  templateCustomization: TemplateCustomization | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  createdAt: string;
  updatedAt: string;
}

/** IG-47: the editable shape this page's form works with - InvoiceDetail's numeric/nullable
 * fields converted to the string/non-null form the shared editor sub-components (FormField,
 * TextAreaField, LineItemsSection) expect, matching InvoiceDraft's own conventions. */
export interface EditableInvoice {
  header: FieldValues;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string;
  lineItems: LineItem[];
  invoiceDiscountType: InvoiceDiscountType;
  invoiceDiscountValue: string;
  notes: string;
  terms: string;
  /** Shown/edited as one free-text field (confirmed with the user) - the DB only stores payment
   * instructions as one flat column, so there's nothing structured to reconstruct here. */
  paymentInstructions: string;
  templateId: string;
  templateCustomization: TemplateCustomization;
}

function taxRateToPreset(taxRate: number): { taxRatePreset: LineItem["taxRatePreset"]; customTaxRate: string } {
  const presets: LineItem["taxRatePreset"][] = ["0", "5", "10", "15", "20"];
  const match = presets.find((preset) => Number(preset) === taxRate);
  return match ? { taxRatePreset: match, customTaxRate: "" } : { taxRatePreset: "custom", customTaxRate: String(taxRate) };
}

function toLineItem(item: InvoiceDetailLineItem, index: number): LineItem {
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

export function toEditableInvoice(detail: InvoiceDetail): EditableInvoice {
  return {
    header: {
      invoiceNumber: detail.invoiceNumber,
      issueDate: detail.issueDate,
      dueDate: detail.dueDate,
      reference: detail.reference ?? "",
    },
    currency: detail.currency,
    seller: detail.seller,
    customer: detail.customer,
    shipTo: detail.shipTo ?? "",
    lineItems: detail.items.length > 0 ? detail.items.map(toLineItem) : [createEmptyLineItem()],
    invoiceDiscountType: detail.invoiceDiscountType,
    invoiceDiscountValue: detail.invoiceDiscountValue !== null ? String(detail.invoiceDiscountValue) : "",
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

/**
 * Maps this page's editable state back into the shared InvoiceSavePayload shape - the free-text
 * Payment Instructions field rides in as `customInstructions` with `paymentInstructions: null`,
 * which InvoiceService.FormatPaymentInstructions on the backend passes through verbatim when no
 * structured fields are given (confirmed: no relabeling, no separator prepended), so this
 * round-trips losslessly through GET -> edit -> PUT with no backend change needed.
 */
export function buildInvoiceUpdatePayload(editable: EditableInvoice): InvoiceSavePayload {
  const parsedDiscountValue = editable.invoiceDiscountValue.trim().length > 0 ? Number.parseFloat(editable.invoiceDiscountValue) : null;

  return {
    invoiceNumber: editable.header.invoiceNumber,
    issueDate: editable.header.issueDate,
    dueDate: editable.header.dueDate,
    reference: nullIfEmpty(editable.header.reference),
    currency: editable.currency,
    seller: editable.seller,
    customer: editable.customer,
    shipTo: nullIfEmpty(editable.shipTo),
    // IG-56's picker is create-flow only (documented scope decision) - the edit page always
    // relies on IG-45's existing find-or-create-by-text matching.
    customerId: null,
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
    invoiceDiscountType: editable.invoiceDiscountType,
    invoiceDiscountValue: Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : null,
    taxCalculationMethod: "Exclusive",
    notes: nullIfEmpty(editable.notes),
    terms: nullIfEmpty(editable.terms),
    customInstructions: nullIfEmpty(editable.paymentInstructions),
    paymentInstructions: null,
    templateId: nullIfEmpty(editable.templateId),
    templateCustomization: editable.templateCustomization,
  };
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-47: account-owned, same credentials:"include" convention as lib/auth.ts/lib/customers.ts. */
export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const response = await fetch(`${baseUrl()}/api/v1/invoices/${id}`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load this invoice."));
  }

  return response.json();
}
