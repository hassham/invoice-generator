import { toCalculationInput } from "../invoice/create/lib/lineItems";
import type { InvoicePdfPayload } from "../invoice/create/lib/invoicePdf";
import type { EditableInvoice } from "./invoiceDetail";

function nullIfEmpty(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

/**
 * IG-197: the saved-invoice detail/edit page (IG-47) has no in-memory InvoiceDraft to reuse
 * invoice/create/lib/invoicePdf.ts's buildInvoicePdfPayload with - this is the same mapping for
 * EditableInvoice's shape instead. The free-text Payment Instructions field rides in as
 * customInstructions with the structured paymentInstructions left null, exactly matching
 * buildInvoiceUpdatePayload's own precedent in invoiceDetail.ts (the backend passes
 * customInstructions through verbatim when no structured fields are given, so this round-trips
 * losslessly with what the user actually saved).
 */
export function buildInvoicePdfPayloadFromEditable(editable: EditableInvoice, templateCode: string): InvoicePdfPayload {
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
    templateCode: nullIfEmpty(templateCode),
    templateCustomization: editable.templateCustomization,
    logo: null,
  };
}
