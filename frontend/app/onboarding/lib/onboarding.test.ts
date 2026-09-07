import { describe, expect, it } from "vitest";
import type { BusinessProfile } from "../../lib/business";
import { profileToOnboardingValues, toBusinessProfileRequest } from "./onboarding";

function makeProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: "business-1",
    businessName: "My Business",
    legalName: "My Business Pty Ltd",
    email: "billing@example.com",
    phone: "+61 2 5550 1234",
    website: "https://example.com",
    addressLine1: "1 Example St",
    addressLine2: null,
    city: "Sydney",
    state: "NSW",
    postalCode: "2000",
    country: "AU",
    registrationNumber: null,
    taxNumber: null,
    defaultCurrency: "AUD",
    defaultTaxRate: 10,
    taxCalculationMethod: "Exclusive",
    defaultPaymentTerms: "Net30",
    defaultPaymentTermsDays: null,
    defaultInvoiceNotes: "Thanks",
    defaultTermsAndConditions: "Terms",
    defaultTemplateId: "template-1",
    invoicePrefix: "INV-",
    nextInvoiceNumber: 1001,
    invoiceNumberPadding: 4,
    logoUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("profileToOnboardingValues", () => {
  it("maps null registration/tax numbers to empty strings", () => {
    const values = profileToOnboardingValues(makeProfile({ registrationNumber: null, taxNumber: null }));

    expect(values.registrationNumber).toBe("");
    expect(values.taxNumber).toBe("");
  });

  it("carries over the business name, country and currency as-is", () => {
    const values = profileToOnboardingValues(makeProfile({ businessName: "Acme", country: "US", defaultCurrency: "USD" }));

    expect(values).toMatchObject({ businessName: "Acme", country: "US", defaultCurrency: "USD" });
  });
});

describe("toBusinessProfileRequest", () => {
  it("preserves every field the wizard doesn't show, untouched from the loaded profile", () => {
    const profile = makeProfile();
    const values = profileToOnboardingValues(profile);

    const request = toBusinessProfileRequest(profile, values);

    expect(request).toMatchObject({
      legalName: profile.legalName,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      addressLine1: profile.addressLine1,
      city: profile.city,
      state: profile.state,
      postalCode: profile.postalCode,
      defaultTaxRate: profile.defaultTaxRate,
      taxCalculationMethod: profile.taxCalculationMethod,
      defaultPaymentTerms: profile.defaultPaymentTerms,
      defaultInvoiceNotes: profile.defaultInvoiceNotes,
      defaultTermsAndConditions: profile.defaultTermsAndConditions,
      defaultTemplateId: profile.defaultTemplateId,
      invoicePrefix: profile.invoicePrefix,
      nextInvoiceNumber: profile.nextInvoiceNumber,
      invoiceNumberPadding: profile.invoiceNumberPadding,
    });
  });

  it("trims and uppercases country/currency, and maps blank registration/tax numbers to null", () => {
    const profile = makeProfile();
    const values = profileToOnboardingValues(profile);

    const request = toBusinessProfileRequest(profile, { ...values, country: " au ", defaultCurrency: " aud ", registrationNumber: "  ", taxNumber: "  " });

    expect(request.country).toBe("AU");
    expect(request.defaultCurrency).toBe("AUD");
    expect(request.registrationNumber).toBeNull();
    expect(request.taxNumber).toBeNull();
  });
});
