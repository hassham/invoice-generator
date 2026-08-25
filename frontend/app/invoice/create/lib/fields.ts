export interface FieldConfig {
  name: string;
  label: string;
  required?: boolean;
  maxLength: number;
  type?: "text" | "email" | "url" | "date";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose on purpose - only rejects obviously-not-a-URL input, not a full RFC 3986 validator.
const URL_PATTERN = /^https?:\/\/[^\s]+\.[^\s]+$/i;

/** FSD section 12: Invoice Header. Currency is handled separately (fixed-option select, not free text). */
export const HEADER_FIELDS: FieldConfig[] = [
  { name: "invoiceNumber", label: "Invoice Number", required: true, maxLength: 50 },
  { name: "issueDate", label: "Issue Date", required: true, maxLength: 10, type: "date" },
  { name: "dueDate", label: "Due Date", required: true, maxLength: 10, type: "date" },
  { name: "reference", label: "Reference / Purchase Order", maxLength: 100 },
];

/**
 * IG-193: replaces the structured Seller/Customer field sets (FSD sections 13/15) with free-text
 * blocks - name, address, contact info and tax numbers all typed together like a real invoice,
 * rather than ~13/~11 separate inputs each. Deliberate, user-confirmed tradeoff: no feature today
 * (auto-fill, structured search, email sending) depends on the structured fields this replaces.
 *
 * `name` deliberately stays "seller"/"customer" (not "from"/"billTo") so it lines up with
 * `InvoiceDraft.seller`/`.customer` - `TextAreaField`'s onChange passes `field.name` straight
 * through as the state key, and the label is what's user-facing, not the field name.
 */
export const FROM_FIELD: FieldConfig = { name: "seller", label: "From", required: true, maxLength: 1000 };
export const BILL_TO_FIELD: FieldConfig = { name: "customer", label: "Bill To", required: true, maxLength: 1000 };

/** FSD section 15 has no "Ship To" concept - new, optional, only shown in Advanced mode. */
export const SHIP_TO_FIELD: FieldConfig = { name: "shipTo", label: "Ship To", maxLength: 1000 };

/** IG-193: header fields only shown once the Basic/Advanced toggle is switched to Advanced. */
export const ADVANCED_HEADER_FIELD_NAMES: string[] = ["dueDate", "reference"];

/** FSD section 12: initial currency choices; system architecture must support more ISO currencies later. */
export const CURRENCY_OPTIONS = ["AUD", "USD", "EUR", "GBP", "CAD", "NZD", "SGD", "AED"] as const;

/**
 * Validates a single field's current text value against its config. Returns undefined when
 * valid. Never mutates or clears the value itself - IG-116's "valid input is never lost" criterion
 * is satisfied by callers simply never programmatically clearing a field, valid or not.
 */
export function validateField(value: string, field: FieldConfig): string | undefined {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return field.required ? `${field.label} is required.` : undefined;
  }

  if (trimmed.length > field.maxLength) {
    return `${field.label} must be ${field.maxLength} characters or fewer.`;
  }

  if (field.type === "email" && !EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address.";
  }

  if (field.type === "url" && !URL_PATTERN.test(trimmed)) {
    return "Enter a valid website address (starting with http:// or https://).";
  }

  return undefined;
}
