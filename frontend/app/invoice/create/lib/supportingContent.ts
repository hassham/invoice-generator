import { validateField, type FieldConfig } from "./fields";
import type { FieldErrors, FieldValues } from "./invoiceDraft";

/** FSD section 30: optional, 2,000 characters. */
export const NOTES_FIELD: FieldConfig = { name: "notes", label: "Notes", maxLength: 2000 };

/** FSD section 31: optional, 5,000 characters, plain text in MVP. */
export const TERMS_FIELD: FieldConfig = { name: "terms", label: "Terms and Conditions", maxLength: 5000 };

/**
 * FSD section 32 lists "Custom Instructions" as one of Payment Instructions' fields alongside 7
 * short structured ones (below) - unlike those, it's open-ended prose, so it gets a textarea like
 * Notes/Terms. FSD doesn't give it a length limit; 1,000 is a deliberate, smaller-than-Notes
 * choice since it's meant to supplement the structured payment fields, not replace them.
 */
export const CUSTOM_INSTRUCTIONS_FIELD: FieldConfig = { name: "customInstructions", label: "Custom Instructions", maxLength: 1000 };

/**
 * FSD section 32's 8 Payment Instructions fields, minus Custom Instructions (see above). All
 * optional. FSD doesn't specify lengths for these - chosen to comfortably fit real-world values
 * (IBANs up to 34 chars, SWIFT/BIC 8-11 chars) with headroom, documented here rather than picked
 * silently.
 */
export const PAYMENT_INSTRUCTION_FIELDS: FieldConfig[] = [
  { name: "bankName", label: "Bank Name", maxLength: 200 },
  { name: "accountName", label: "Account Name", maxLength: 200 },
  { name: "bsb", label: "BSB / Routing Number", maxLength: 50 },
  { name: "accountNumber", label: "Account Number", maxLength: 50 },
  { name: "iban", label: "IBAN", maxLength: 50 },
  { name: "swift", label: "SWIFT", maxLength: 20 },
  { name: "paymentReference", label: "Payment Reference", maxLength: 100 },
];

export interface SupportingContentValues {
  notes: string;
  terms: string;
  customInstructions: string;
  paymentInstructions: FieldValues;
}

export function createEmptySupportingContent(): SupportingContentValues {
  return {
    notes: "",
    terms: "",
    customInstructions: "",
    paymentInstructions: Object.fromEntries(PAYMENT_INSTRUCTION_FIELDS.map((field) => [field.name, ""])),
  };
}

export interface SupportingContentErrors {
  notes?: string;
  terms?: string;
  customInstructions?: string;
  paymentInstructions: FieldErrors;
}

export function validateSupportingContent(values: SupportingContentValues): SupportingContentErrors {
  return {
    notes: validateField(values.notes, NOTES_FIELD),
    terms: validateField(values.terms, TERMS_FIELD),
    customInstructions: validateField(values.customInstructions, CUSTOM_INSTRUCTIONS_FIELD),
    paymentInstructions: Object.fromEntries(
      PAYMENT_INSTRUCTION_FIELDS.map((field) => [field.name, validateField(values.paymentInstructions[field.name] ?? "", field)]),
    ),
  };
}

export function hasAnySupportingContentError(errors: SupportingContentErrors): boolean {
  return (
    errors.notes !== undefined ||
    errors.terms !== undefined ||
    errors.customInstructions !== undefined ||
    Object.values(errors.paymentInstructions).some((message) => message !== undefined)
  );
}

/** FSD/IG-122: "optional empty sections do not create misleading output" - true only once every field in the block is empty. */
export function hasAnyPaymentInstructionContent(values: SupportingContentValues): boolean {
  return (
    values.customInstructions.trim().length > 0 ||
    Object.values(values.paymentInstructions).some((value) => value.trim().length > 0)
  );
}
