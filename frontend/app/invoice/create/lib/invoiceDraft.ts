import { HEADER_FIELDS, validateField, type FieldConfig } from "./fields";

export type FieldValues = Record<string, string>;

export interface InvoiceDraft {
  header: FieldValues;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string;
}

function emptyValues(fields: FieldConfig[]): FieldValues {
  return Object.fromEntries(fields.map((field) => [field.name, ""]));
}

/**
 * docs/DATABASE_SCHEMA.md's businesses table defaults default_payment_terms to DueOnReceipt (not
 * the 14-day figure FSD section 12 uses as an illustrative example of the Issue Date + terms
 * formula) - with no saved business profile to read real terms from yet (Epic IG-8 isn't built),
 * Due Date defaults to Issue Date (0-day terms) as the schema-aligned choice, editable afterward.
 * AUD mirrors the same default already used for a new account's business in
 * AccountRegistrationService. IG-193: seller/customer/shipTo are free text (see lib/fields.ts),
 * so - unlike the structured fields they replaced - they have no defaultable sub-values.
 */
export function createEmptyDraft(): InvoiceDraft {
  return {
    header: emptyValues(HEADER_FIELDS),
    currency: "AUD",
    seller: "",
    customer: "",
    shipTo: "",
  };
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type FieldErrors = Record<string, string | undefined>;

export function validateFieldValues(values: FieldValues, fields: FieldConfig[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    errors[field.name] = validateField(values[field.name] ?? "", field);
  }
  return errors;
}

/**
 * FSD section 12: "Due date cannot precede issue date unless explicitly allowed through
 * configuration." No such configuration exists yet, so the rule is enforced unconditionally.
 */
export function validateHeaderFields(header: FieldValues): FieldErrors {
  const errors = validateFieldValues(header, HEADER_FIELDS);

  if (!errors.issueDate && !errors.dueDate && header.issueDate && header.dueDate) {
    if (header.dueDate < header.issueDate) {
      errors.dueDate = "Due date cannot be earlier than the issue date.";
    }
  }

  return errors;
}

export function hasAnyError(errors: FieldErrors): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}
