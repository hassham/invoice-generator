import type { InvoiceDraft } from "./invoiceDraft";
import type { InvoiceDiscountType } from "./invoiceTotals";
import { toCalculationInput, type LineItem } from "./lineItems";
import type { SupportingContentValues } from "./supportingContent";
import type { TemplateCustomization } from "./templateCustomization";

export interface InvoicePdfLineItemPayload {
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface InvoicePdfPaymentInstructionsPayload {
  bankName: string | null;
  accountName: string | null;
  bsb: string | null;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
  paymentReference: string | null;
}

export interface InvoicePdfPayload {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  reference: string | null;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string | null;
  items: InvoicePdfLineItemPayload[];
  invoiceDiscountType: InvoiceDiscountType;
  invoiceDiscountValue: number | null;
  taxCalculationMethod: "Exclusive" | "Inclusive";
  notes: string | null;
  terms: string | null;
  customInstructions: string | null;
  paymentInstructions: InvoicePdfPaymentInstructionsPayload | null;
  templateCode: string | null;
  templateCustomization: TemplateCustomization | null;
  logo: string | null;
}

function nullIfEmpty(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

/**
 * Maps the editor's existing state shapes into the backend's InvoicePdfRequest JSON shape
 * (backend/src/InvoiceApp.Application/Documents/InvoicePdfRequest.cs) - a pure function so the
 * mapping itself is unit-testable without mounting CreateInvoiceEditor.
 */
export function buildInvoicePdfPayload(input: {
  draft: InvoiceDraft;
  lineItems: LineItem[];
  invoiceDiscountType: InvoiceDiscountType;
  invoiceDiscountValue: string;
  supportingContent: SupportingContentValues;
  templateCode: string;
}): InvoicePdfPayload {
  const { draft, lineItems, invoiceDiscountType, invoiceDiscountValue, supportingContent, templateCode } = input;
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
    templateCode: nullIfEmpty(templateCode),
    templateCustomization: draft.templateCustomization,
    logo: draft.logo,
  };
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }
  const match = /filename="?([^";]+)"?/.exec(contentDisposition);
  return match?.[1] ?? null;
}

/**
 * IG-43: POSTs the current draft to the stateless PDF endpoint and triggers a browser download of
 * the response - same NEXT_PUBLIC_API_BASE_URL convention lib/templates.ts already established.
 */
export async function downloadInvoicePdf(payload: InvoicePdfPayload): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
  const response = await fetch(`${baseUrl}/api/v1/invoices/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? "Failed to generate the PDF.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = extractFilename(response.headers.get("content-disposition")) ?? "invoice.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
