import {
  createEmptyLineItem,
  resolveTaxRateDefault,
  toCalculationInput,
  type LineItem,
} from "../../../../invoice/create/lib/lineItems";
import type { CreatePurchaseOrderRequest } from "../../../../lib/purchaseOrders";

/**
 * IG-307: the editable shape of a not-yet-created purchase order. Every field is a string, as in
 * the invoice editor's own draft model - the form is the source of truth for what the user typed,
 * and parsing happens once, at the edge, in buildCreatePurchaseOrderRequest.
 */
export interface PurchaseOrderDraft {
  /** A `Customer` row id. Purchase order suppliers are customer records (see IG-236); the backend
   * rejects a SupplierId that is not one, so this is a selection rather than free text - unlike the
   * invoice editor's Bill To, which IG-193 deliberately made free text. */
  supplierId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  reference: string;
  lineItems: LineItem[];
  notes: string;
  terms: string;
  deliveryInstructions: string;
}

export interface PurchaseOrderDraftErrors {
  supplierId?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
}

export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Required by is left blank rather than guessed: an order's delivery deadline is a commitment the
 * supplier is held to, and defaulting it to today (or to an invented +14 days) would quietly put a
 * date on the document the user never chose.
 */
export function createEmptyPurchaseOrderDraft(
  currency: string,
  defaultTaxRate: number,
  issueDate: string
): PurchaseOrderDraft {
  return {
    supplierId: "",
    issueDate,
    dueDate: "",
    currency,
    reference: "",
    lineItems: [{ ...createEmptyLineItem(), ...resolveTaxRateDefault(defaultTaxRate) }],
    notes: "",
    terms: "",
    deliveryInstructions: "",
  };
}

export function newPurchaseOrderLineItem(defaultTaxRate: number): LineItem {
  return { ...createEmptyLineItem(), ...resolveTaxRateDefault(defaultTaxRate) };
}

export function validatePurchaseOrderDraft(draft: PurchaseOrderDraft): PurchaseOrderDraftErrors {
  const errors: PurchaseOrderDraftErrors = {};

  if (draft.supplierId.trim().length === 0) {
    errors.supplierId = "Choose the supplier this order is going to.";
  }

  if (draft.issueDate.trim().length === 0) {
    errors.issueDate = "Issue date is required.";
  }

  if (draft.dueDate.trim().length === 0) {
    errors.dueDate = "Required by date is required.";
  } else if (draft.issueDate.trim().length > 0 && draft.dueDate < draft.issueDate) {
    // Both are yyyy-mm-dd, so a plain string comparison is already chronological.
    errors.dueDate = "Required by date cannot be before the issue date.";
  }

  if (draft.currency.trim().length === 0) {
    errors.currency = "Currency is required.";
  }

  return errors;
}

export function hasAnyPurchaseOrderDraftError(errors: PurchaseOrderDraftErrors): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}

export interface PurchaseOrderDraftTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/**
 * A preview figure only - FSD section 28 and AGENTS.md both make the backend authoritative, and
 * PurchaseOrderService recalculates all three from the line items it is sent. This deliberately
 * repeats that service's exact formula (line subtotal = quantity x unit price - discount, then tax
 * on top of the discounted amount) so the number on screen is the number that gets stored.
 */
export function computePurchaseOrderDraftTotals(items: LineItem[]): PurchaseOrderDraftTotals {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of items) {
    const { quantity, unitPrice, taxRate, discount } = toCalculationInput(item);
    const lineSubtotal = quantity * unitPrice - discount;
    subtotal += lineSubtotal;
    taxAmount += lineSubtotal * (taxRate / 100);
  }

  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Sends only what the user chose. No line or document totals are included: the backend derives
 * them, and sending them would create a second, divergent source of truth. */
export function buildCreatePurchaseOrderRequest(draft: PurchaseOrderDraft): CreatePurchaseOrderRequest {
  return {
    supplierId: draft.supplierId,
    issueDate: draft.issueDate,
    dueDate: draft.dueDate,
    currency: draft.currency,
    reference: emptyToNull(draft.reference),
    items: draft.lineItems.map((item) => {
      const { quantity, unitPrice, taxRate, discount } = toCalculationInput(item);
      return {
        description: item.description.trim(),
        quantity,
        unit: emptyToNull(item.unit),
        unitPrice,
        taxRate,
        discount,
      };
    }),
    notes: emptyToNull(draft.notes),
    terms: emptyToNull(draft.terms),
    deliveryInstructions: emptyToNull(draft.deliveryInstructions),
  };
}
