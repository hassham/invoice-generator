import type { InvoiceDraft } from "./invoiceDraft";
import type { InvoiceDiscountType } from "./invoiceTotals";
import { toCalculationInput, type LineItem } from "./lineItems";
import type { SupportingContentValues } from "./supportingContent";
import type { TemplateCustomization } from "./templateCustomization";

/** IG-45: how long the editor waits after the last edit before auto-saving remotely - "without
 * saving every keystroke" (this Story's own AC). A code constant, not a user setting - no
 * business-settings mechanism exists yet (Epic IG-8) to make it configurable. */
export const AUTO_SAVE_DEBOUNCE_MS = 3000;

export interface InvoiceSaveLineItemPayload {
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface InvoiceSavePaymentInstructionsPayload {
  bankName: string | null;
  accountName: string | null;
  bsb: string | null;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
  paymentReference: string | null;
}

export interface InvoiceSavePayload {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  reference: string | null;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string | null;
  items: InvoiceSaveLineItemPayload[];
  invoiceDiscountType: InvoiceDiscountType;
  invoiceDiscountValue: number | null;
  taxCalculationMethod: "Exclusive" | "Inclusive";
  notes: string | null;
  terms: string | null;
  customInstructions: string | null;
  paymentInstructions: InvoiceSavePaymentInstructionsPayload | null;
  templateId: string | null;
  templateCustomization: TemplateCustomization | null;
}

export interface SavedInvoice {
  id: string;
  customerId: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  reference: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  createdAt: string;
  updatedAt: string;
}

function nullIfEmpty(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

/**
 * Maps the editor's existing state shapes into the backend's InvoiceSaveRequest JSON shape
 * (backend/src/InvoiceApp.Application/Invoicing/InvoiceSaveRequest.cs) - same mapping pattern as
 * lib/invoicePdf.ts's buildInvoicePdfPayload, but templateId (a real Guid the DB stores as a FK)
 * instead of templateCode, and no logo (no column exists for it - client-only, a documented gap
 * since IG-42).
 */
export function buildInvoiceSavePayload(input: {
  draft: InvoiceDraft;
  lineItems: LineItem[];
  invoiceDiscountType: InvoiceDiscountType;
  invoiceDiscountValue: string;
  supportingContent: SupportingContentValues;
}): InvoiceSavePayload {
  const { draft, lineItems, invoiceDiscountType, invoiceDiscountValue, supportingContent } = input;
  const parsedDiscountValue = invoiceDiscountValue.trim().length > 0 ? Number.parseFloat(invoiceDiscountValue) : null;

  return {
    invoiceNumber: draft.header.invoiceNumber,
    issueDate: draft.header.issueDate,
    dueDate: draft.header.dueDate,
    reference: nullIfEmpty(draft.header.reference),
    currency: draft.currency,
    seller: draft.seller,
    customer: draft.customer,
    shipTo: nullIfEmpty(draft.shipTo),
    items: lineItems.map((item) => {
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
    invoiceDiscountType,
    invoiceDiscountValue: Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : null,
    taxCalculationMethod: "Exclusive",
    notes: nullIfEmpty(supportingContent.notes),
    terms: nullIfEmpty(supportingContent.terms),
    customInstructions: nullIfEmpty(supportingContent.customInstructions),
    paymentInstructions: {
      bankName: nullIfEmpty(supportingContent.paymentInstructions.bankName ?? ""),
      accountName: nullIfEmpty(supportingContent.paymentInstructions.accountName ?? ""),
      bsb: nullIfEmpty(supportingContent.paymentInstructions.bsb ?? ""),
      accountNumber: nullIfEmpty(supportingContent.paymentInstructions.accountNumber ?? ""),
      iban: nullIfEmpty(supportingContent.paymentInstructions.iban ?? ""),
      swift: nullIfEmpty(supportingContent.paymentInstructions.swift ?? ""),
      paymentReference: nullIfEmpty(supportingContent.paymentInstructions.paymentReference ?? ""),
    },
    templateId: nullIfEmpty(draft.templateId),
    templateCustomization: draft.templateCustomization,
  };
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** POSTs a new invoice (first save) - same credentials:"include" convention as lib/auth.ts, since
 * this route requires an authenticated session. */
export async function createInvoice(payload: InvoiceSavePayload): Promise<SavedInvoice> {
  const response = await fetch(`${baseUrl()}/api/v1/invoices`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to save this invoice."));
  }

  return response.json();
}

/** PUTs an update to a previously-saved invoice (every save after the first). */
export async function updateInvoice(invoiceId: string, payload: InvoiceSavePayload): Promise<SavedInvoice> {
  const response = await fetch(`${baseUrl()}/api/v1/invoices/${invoiceId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to save this invoice."));
  }

  return response.json();
}
