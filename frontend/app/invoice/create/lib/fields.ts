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
 * FSD section 13: Seller Information. Registration/Tax labels use the Australian configuration
 * ("ABN" / "GST Registration / ABN") since that's the only market this app currently targets
 * (docs/DATABASE_SCHEMA.md's businesses.country default, also used in AccountRegistrationService) -
 * FSD notes fields "should support configurable labels" once other markets are added, which needs
 * a real business-settings/localisation mechanism that doesn't exist yet (Epic IG-8).
 */
export const SELLER_FIELDS: FieldConfig[] = [
  { name: "businessName", label: "Business Name", required: true, maxLength: 200 },
  { name: "contactName", label: "Contact Name", maxLength: 200 },
  { name: "email", label: "Email", maxLength: 320, type: "email" },
  { name: "phone", label: "Phone", maxLength: 50 },
  { name: "website", label: "Website", maxLength: 300, type: "url" },
  { name: "addressLine1", label: "Address Line 1", maxLength: 200 },
  { name: "addressLine2", label: "Address Line 2", maxLength: 200 },
  { name: "city", label: "City", maxLength: 100 },
  { name: "state", label: "State / Province", maxLength: 100 },
  { name: "postalCode", label: "Postal Code", maxLength: 20 },
  { name: "country", label: "Country", required: true, maxLength: 100 },
  { name: "registrationNumber", label: "ABN", maxLength: 100 },
  { name: "taxNumber", label: "GST Registration / ABN", maxLength: 100 },
];

/** FSD section 15: Customer Information. */
export const CUSTOMER_FIELDS: FieldConfig[] = [
  { name: "customerName", label: "Business / Customer Name", required: true, maxLength: 200 },
  { name: "contactName", label: "Contact Name", maxLength: 200 },
  { name: "email", label: "Email", maxLength: 320, type: "email" },
  { name: "phone", label: "Phone", maxLength: 50 },
  { name: "addressLine1", label: "Address Line 1", maxLength: 200 },
  { name: "addressLine2", label: "Address Line 2", maxLength: 200 },
  { name: "city", label: "City", maxLength: 100 },
  { name: "state", label: "State / Province", maxLength: 100 },
  { name: "postalCode", label: "Postal Code", maxLength: 20 },
  { name: "country", label: "Country", maxLength: 100 },
  { name: "taxNumber", label: "Tax Number", maxLength: 100 },
];

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
