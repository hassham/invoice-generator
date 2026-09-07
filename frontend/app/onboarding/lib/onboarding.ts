import type { BusinessProfile, BusinessProfileRequest } from "../../lib/business";

/**
 * FSD section 116: 5-step wizard after registration - Business Name, Country, Currency, Tax
 * Registration, Upload Logo - each skippable, "Start Creating Invoices" to finish. "Tax
 * Registration" is read here as covering both Registration Number and Tax Number together (the
 * FSD names one step but the Business entity has always had both as separate fields since IG-53)
 * rather than picking one arbitrarily.
 */
export type OnboardingStepId = "business-name" | "country" | "currency" | "tax" | "logo";

export const ONBOARDING_STEPS: OnboardingStepId[] = ["business-name", "country", "currency", "tax", "logo"];

export interface OnboardingValues {
  businessName: string;
  country: string;
  defaultCurrency: string;
  registrationNumber: string;
  taxNumber: string;
}

export function profileToOnboardingValues(profile: BusinessProfile): OnboardingValues {
  return {
    businessName: profile.businessName,
    country: profile.country,
    defaultCurrency: profile.defaultCurrency,
    registrationNumber: profile.registrationNumber ?? "",
    taxNumber: profile.taxNumber ?? "",
  };
}

function trimmedOrNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

/**
 * PUT /api/v1/business replaces the whole profile, not just the fields this wizard shows - every
 * other field (address, invoice defaults/numbering, template) must round-trip from the loaded
 * profile unchanged, or a step saved here would silently wipe settings IG-51/IG-53/IG-54 already
 * populated.
 */
export function toBusinessProfileRequest(profile: BusinessProfile, values: OnboardingValues): BusinessProfileRequest {
  return {
    businessName: values.businessName.trim(),
    legalName: profile.legalName,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
    country: values.country.trim().toUpperCase(),
    registrationNumber: trimmedOrNull(values.registrationNumber),
    taxNumber: trimmedOrNull(values.taxNumber),
    defaultCurrency: values.defaultCurrency.trim().toUpperCase(),
    defaultTaxRate: profile.defaultTaxRate,
    taxCalculationMethod: profile.taxCalculationMethod,
    defaultPaymentTerms: profile.defaultPaymentTerms,
    defaultPaymentTermsDays: profile.defaultPaymentTermsDays,
    defaultInvoiceNotes: profile.defaultInvoiceNotes,
    defaultTermsAndConditions: profile.defaultTermsAndConditions,
    defaultTemplateId: profile.defaultTemplateId,
    invoicePrefix: profile.invoicePrefix,
    nextInvoiceNumber: profile.nextInvoiceNumber,
    invoiceNumberPadding: profile.invoiceNumberPadding,
  };
}
