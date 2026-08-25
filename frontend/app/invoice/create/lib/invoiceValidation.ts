import { BILL_TO_FIELD, FROM_FIELD, SHIP_TO_FIELD, validateField } from "./fields";
import { hasAnyError, validateHeaderFields, type FieldErrors, type FieldValues } from "./invoiceDraft";
import { validateInvoiceDiscountValue, type InvoiceDiscountType } from "./invoiceTotals";
import { hasAnyLineItemError, validateLineItems, type LineItem, type LineItemErrors } from "./lineItems";
import {
  hasAnySupportingContentError,
  validateSupportingContent,
  type SupportingContentErrors,
  type SupportingContentValues,
} from "./supportingContent";

export interface InvoiceValidationInput {
  header: FieldValues;
  seller: string;
  customer: string;
  shipTo: string;
  lineItems: LineItem[];
  invoiceDiscountType: InvoiceDiscountType;
  invoiceDiscountValue: string;
  supportingContent: SupportingContentValues;
}

export interface InvoiceValidationResult {
  headerErrors: FieldErrors;
  sellerError?: string;
  customerError?: string;
  shipToError?: string;
  lineItemErrors: Record<string, LineItemErrors>;
  invoiceDiscountError?: string;
  supportingContentErrors: SupportingContentErrors;
}

/**
 * FSD section 41: full-invoice validation, aggregating every section's existing field-level rules
 * rather than introducing new ones. Whichever future Story adds Save/PDF/Print (IG-43/44/45)
 * should gate on `isInvoiceValid` before finalizing/output, per that section's "invalid invoices
 * cannot be finalized or output" - no such action exists yet, so IG-38/IG-123 only wires this up
 * to an on-demand "Review invoice" check in the editor.
 */
export function validateInvoice(input: InvoiceValidationInput): InvoiceValidationResult {
  return {
    headerErrors: validateHeaderFields(input.header),
    sellerError: validateField(input.seller, FROM_FIELD),
    customerError: validateField(input.customer, BILL_TO_FIELD),
    shipToError: validateField(input.shipTo, SHIP_TO_FIELD),
    lineItemErrors: validateLineItems(input.lineItems),
    invoiceDiscountError: validateInvoiceDiscountValue(input.invoiceDiscountType, input.invoiceDiscountValue),
    supportingContentErrors: validateSupportingContent(input.supportingContent),
  };
}

export function isInvoiceValid(result: InvoiceValidationResult): boolean {
  return (
    !hasAnyError(result.headerErrors) &&
    !result.sellerError &&
    !result.customerError &&
    !result.shipToError &&
    !hasAnyLineItemError(result.lineItemErrors) &&
    !result.invoiceDiscountError &&
    !hasAnySupportingContentError(result.supportingContentErrors)
  );
}

function hasAnyPaymentInstructionError(result: InvoiceValidationResult): boolean {
  return Object.values(result.supportingContentErrors.paymentInstructions).some((message) => message !== undefined);
}

const SECTION_LABELS: Array<{ label: string; hasError: (result: InvoiceValidationResult) => boolean }> = [
  { label: "Invoice details", hasError: (result) => hasAnyError(result.headerErrors) },
  { label: "From", hasError: (result) => Boolean(result.sellerError) },
  { label: "Bill To", hasError: (result) => Boolean(result.customerError) },
  { label: "Ship To", hasError: (result) => Boolean(result.shipToError) },
  { label: "Items", hasError: (result) => hasAnyLineItemError(result.lineItemErrors) },
  { label: "Totals", hasError: (result) => Boolean(result.invoiceDiscountError) },
  { label: "Terms and Conditions", hasError: (result) => Boolean(result.supportingContentErrors.terms) },
  {
    label: "Notes, payment instructions & custom instructions",
    hasError: (result) =>
      Boolean(result.supportingContentErrors.notes) ||
      Boolean(result.supportingContentErrors.customInstructions) ||
      hasAnyPaymentInstructionError(result),
  },
];

/** Which named sections currently have at least one error - drives the review-summary banner. */
export function getInvalidSectionLabels(result: InvoiceValidationResult): string[] {
  return SECTION_LABELS.filter(({ hasError }) => hasError(result)).map(({ label }) => label);
}

/**
 * True when at least one current error lives in a field that's only visible once the
 * Basic/Advanced toggle (IG-193) is switched to Advanced - drives auto-revealing Advanced on
 * Review so an error is never left hidden from the user.
 */
export function hasAdvancedOnlyError(result: InvoiceValidationResult): boolean {
  return (
    Boolean(result.headerErrors.dueDate) ||
    Boolean(result.headerErrors.reference) ||
    Boolean(result.shipToError) ||
    Boolean(result.supportingContentErrors.notes) ||
    Boolean(result.supportingContentErrors.customInstructions) ||
    hasAnyPaymentInstructionError(result)
  );
}
