import { afterEach, describe, expect, it, vi } from "vitest";
import { formatInvoiceNumberPreview, generateNextInvoiceNumber, getBusinessProfile, updateBusinessProfile } from "./business";

const sampleProfile = {
  id: "biz-1",
  businessName: "Acme Pty Ltd",
  legalName: null,
  email: null,
  phone: null,
  website: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: "AU",
  registrationNumber: null,
  taxNumber: null,
  defaultCurrency: "AUD",
  defaultTaxRate: 10,
  taxCalculationMethod: "Exclusive",
  defaultPaymentTerms: "DueOnReceipt",
  defaultPaymentTermsDays: null,
  defaultInvoiceNotes: null,
  defaultTermsAndConditions: null,
  defaultTemplateId: null,
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  invoiceNumberPadding: 4,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

const sampleRequest = {
  businessName: "Acme Pty Ltd",
  legalName: null,
  email: null,
  phone: null,
  website: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: "AU",
  registrationNumber: null,
  taxNumber: null,
  defaultCurrency: "AUD",
  defaultTaxRate: 10,
  taxCalculationMethod: "Exclusive" as const,
  defaultPaymentTerms: "DueOnReceipt" as const,
  defaultPaymentTermsDays: null,
  defaultInvoiceNotes: null,
  defaultTermsAndConditions: null,
  defaultTemplateId: null,
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  invoiceNumberPadding: 4,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getBusinessProfile", () => {
  it("sends credentials: include and returns the parsed profile", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleProfile) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getBusinessProfile();

    expect(result).toEqual(sampleProfile);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/business");
    expect(init.credentials).toBe("include");
  });

  it("throws the server's error detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Your session has expired. Please sign in again." }) }));

    await expect(getBusinessProfile()).rejects.toThrow("Your session has expired. Please sign in again.");
  });

  it("falls back to a generic message when the error response has no detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("not json")) }));

    await expect(getBusinessProfile()).rejects.toThrow("Failed to load your business profile.");
  });
});

describe("updateBusinessProfile", () => {
  it("puts the request with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleProfile) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateBusinessProfile(sampleRequest);

    expect(result).toEqual(sampleProfile);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/business");
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body)).toEqual(sampleRequest);
  });

  it("throws the server's error detail on validation failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Business name is required." }) }));

    await expect(updateBusinessProfile(sampleRequest)).rejects.toThrow("Business name is required.");
  });
});

describe("generateNextInvoiceNumber", () => {
  it("posts with credentials included and returns the parsed number", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ invoiceNumber: "INV-1001" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateNextInvoiceNumber();

    expect(result).toEqual({ invoiceNumber: "INV-1001" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/business/next-invoice-number");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
  });

  it("throws the server's error detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Failed to generate the next invoice number." }) }));

    await expect(generateNextInvoiceNumber()).rejects.toThrow("Failed to generate the next invoice number.");
  });
});

describe("formatInvoiceNumberPreview", () => {
  it("zero-pads the next number to the configured width", () => {
    expect(formatInvoiceNumberPreview("INV-", 1001, 4)).toBe("INV-1001");
    expect(formatInvoiceNumberPreview("INV-", 1, 6)).toBe("INV-000001");
  });

  it("falls back to safe defaults for invalid input rather than throwing", () => {
    expect(formatInvoiceNumberPreview("INV-", Number.NaN, Number.NaN)).toBe("INV-0");
    expect(formatInvoiceNumberPreview("INV-", -5, 0)).toBe("INV-0");
  });
});
