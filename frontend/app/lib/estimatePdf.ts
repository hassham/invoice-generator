import { toCalculationInput } from "../invoice/create/lib/lineItems";
import type { InvoicePdfPayload } from "../invoice/create/lib/invoicePdf";
import type { EditableEstimate } from "./estimate";

function nullIfEmpty(value: string): string | null {
  return value.trim().length > 0 ? value : null;
}

/**
 * IG-220: mirrors buildInvoicePdfPayloadFromEditable exactly, reusing the exact same
 * InvoicePdfPayload shape/backend endpoint (POST /api/v1/invoices/pdf) - only
 * documentTypeLabel differs, which is what makes the rendered PDF say "Estimate" instead of
 * "Invoice" (InvoicePdfDocument.Compose, backend/src/InvoiceApp.Modules.Documents/Pdf).
 */
export function buildEstimatePdfPayloadFromEditable(editable: EditableEstimate, templateCode: string): InvoicePdfPayload {
  const parsedDiscountValue = editable.discountValue.trim().length > 0 ? Number.parseFloat(editable.discountValue) : null;

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
    invoiceDiscountType: editable.discountType,
    invoiceDiscountValue: Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : null,
    taxCalculationMethod: "Exclusive",
    notes: nullIfEmpty(editable.notes),
    terms: nullIfEmpty(editable.terms),
    customInstructions: nullIfEmpty(editable.paymentInstructions),
    paymentInstructions: null,
    templateCode: nullIfEmpty(templateCode),
    templateCustomization: editable.templateCustomization,
    logo: null,
    documentTypeLabel: "Estimate",
  };
}
