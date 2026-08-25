/** FSD section 20: examples only - "User should eventually be able to define custom units," not built yet. */
export const UNIT_OPTIONS = ["Item", "Hour", "Day", "Week", "Month", "Project", "Kg", "Km", "Service"] as const;

/** FSD section 22: preset tax rates, "Custom" reveals a free-entry percentage field. */
export const TAX_RATE_PRESETS = ["0", "5", "10", "15", "20", "custom"] as const;
export type TaxRatePreset = (typeof TAX_RATE_PRESETS)[number];

/** FSD section 22: "Australian default: 10% GST" - no business-settings mechanism exists yet to override this. */
export const DEFAULT_TAX_RATE_PRESET: TaxRatePreset = "10";

export interface LineItem {
  /** Stable React list key / reorder target - not a persisted id, this form has no backend yet. */
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRatePreset: TaxRatePreset;
  customTaxRate: string;
  discount: string;
}

let nextId = 0;

export function createEmptyLineItem(): LineItem {
  nextId += 1;
  return {
    id: `line-item-${nextId}`,
    description: "",
    quantity: "1",
    unit: "",
    unitPrice: "",
    taxRatePreset: DEFAULT_TAX_RATE_PRESET,
    customTaxRate: "",
    discount: "0",
  };
}

/** FSD section 24's "Duplicate Item" action - same field values, a fresh id for React's list key. */
export function cloneLineItem(item: LineItem): LineItem {
  nextId += 1;
  return { ...item, id: `line-item-${nextId}` };
}

export interface LineItemErrors {
  description?: string;
  quantity?: string;
  unitPrice?: string;
  discount?: string;
  customTaxRate?: string;
}

export interface LineItemTotals {
  lineAmount: number;
  discountedLineAmount: number;
  taxAmount: number;
  lineTotal: number;
}

function parseNonNegativeNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function effectiveTaxRate(item: LineItem): number {
  if (item.taxRatePreset === "custom") {
    return parseNonNegativeNumber(item.customTaxRate);
  }
  return Number.parseFloat(item.taxRatePreset);
}

/**
 * FSD section 27's per-line formula: Line Amount = Quantity x Unit Price; Discounted Line Amount =
 * Line Amount - Discount; then that line's own tax is applied on top to get its Line Total (FSD
 * section 17 lists Line Total as one of the item's own fields). The invoice-wide roll-up
 * (aggregate Subtotal, invoice-level discount, tax-inclusive/exclusive business setting,
 * additional charges, amount due - FSD section 26's full 8-step engine) is S24/IG-36's job, not
 * this Story's - this is only ever a frontend preview figure, matching FSD section 28's
 * "frontend calculations may be used for immediate preview, backend calculation is authoritative."
 */
export function computeLineTotals(item: LineItem): LineItemTotals {
  const quantity = parseNonNegativeNumber(item.quantity);
  const unitPrice = parseNonNegativeNumber(item.unitPrice);
  const discount = parseNonNegativeNumber(item.discount);
  const taxRate = effectiveTaxRate(item);

  const lineAmount = quantity * unitPrice;
  const discountedLineAmount = Math.max(lineAmount - discount, 0);
  const taxAmount = discountedLineAmount * (taxRate / 100);
  const lineTotal = discountedLineAmount + taxAmount;

  return { lineAmount, discountedLineAmount, taxAmount, lineTotal };
}

export function sumLineTotals(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + computeLineTotals(item).lineTotal, 0);
}

/** Numeric shape `invoiceTotals.ts` needs - reuses this module's own string parsing so the two stay consistent. */
export interface LineItemCalculationInput {
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export function toCalculationInput(item: LineItem): LineItemCalculationInput {
  return {
    quantity: parseNonNegativeNumber(item.quantity),
    unitPrice: parseNonNegativeNumber(item.unitPrice),
    taxRate: effectiveTaxRate(item),
    discount: parseNonNegativeNumber(item.discount),
  };
}

const DESCRIPTION_MAX_LENGTH = 500;

/** FSD section 18-23: field-level rules for a single line item. */
export function validateLineItem(item: LineItem): LineItemErrors {
  const errors: LineItemErrors = {};

  if (item.description.trim().length === 0) {
    errors.description = "Description is required.";
  } else if (item.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  const quantity = Number.parseFloat(item.quantity);
  if (item.quantity.trim().length === 0 || !Number.isFinite(quantity)) {
    errors.quantity = "Quantity is required.";
  } else if (quantity <= 0) {
    errors.quantity = "Quantity must be greater than 0.";
  }

  const unitPrice = Number.parseFloat(item.unitPrice);
  if (item.unitPrice.trim().length === 0 || !Number.isFinite(unitPrice)) {
    errors.unitPrice = "Unit Price is required.";
  } else if (unitPrice < 0) {
    errors.unitPrice = "Unit Price cannot be negative.";
  }

  if (item.discount.trim().length > 0) {
    const discount = Number.parseFloat(item.discount);
    if (!Number.isFinite(discount) || discount < 0) {
      errors.discount = "Discount cannot be negative.";
    } else if (Number.isFinite(quantity) && Number.isFinite(unitPrice) && discount > quantity * unitPrice) {
      errors.discount = "Discount cannot exceed the line amount.";
    }
  }

  if (item.taxRatePreset === "custom") {
    const customRate = Number.parseFloat(item.customTaxRate);
    if (item.customTaxRate.trim().length === 0 || !Number.isFinite(customRate)) {
      errors.customTaxRate = "Enter a custom tax rate.";
    } else if (customRate < 0 || customRate > 100) {
      errors.customTaxRate = "Tax rate must be between 0 and 100.";
    }
  }

  return errors;
}

export function validateLineItems(items: LineItem[]): Record<string, LineItemErrors> {
  return Object.fromEntries(items.map((item) => [item.id, validateLineItem(item)]));
}

export function hasAnyLineItemError(errorsByItemId: Record<string, LineItemErrors>): boolean {
  return Object.values(errorsByItemId).some((errors) => Object.values(errors).some((message) => message !== undefined));
}
