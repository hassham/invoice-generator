import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "./invoiceDraft";
import { buildInvoiceSavePayload, createInvoice, updateInvoice } from "./invoiceSave";
import { createEmptyLineItem } from "./lineItems";
import { createEmptySupportingContent } from "./supportingContent";

describe("buildInvoiceSavePayload", () => {
  it("maps the editor's state into the backend's request shape", () => {
    const draft = {
      ...createEmptyDraft(),
      seller: "Acme",
      customer: "Jane's Cafe",
      templateId: "11111111-1111-1111-1111-111111111111",
      header: { ...createEmptyDraft().header, invoiceNumber: "INV-1", issueDate: "2026-08-19", dueDate: "2026-09-02" },
    };
    const lineItems = [{ ...createEmptyLineItem(), description: "Consulting", quantity: "2", unitPrice: "50" }];

    const payload = buildInvoiceSavePayload({
      draft,
      lineItems,
      invoiceDiscountType: "None",
      invoiceDiscountValue: "",
      supportingContent: createEmptySupportingContent(),
    });

    expect(payload.invoiceNumber).toBe("INV-1");
    expect(payload.seller).toBe("Acme");
    expect(payload.customer).toBe("Jane's Cafe");
    expect(payload.items).toEqual([{ description: "Consulting", quantity: 2, unit: null, unitPrice: 50, taxRate: 10, discount: 0 }]);
    expect(payload.templateId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("nulls out empty optional text fields, including a blank templateId, rather than sending empty strings", () => {
    const payload = buildInvoiceSavePayload({
      draft: createEmptyDraft(),
      lineItems: [createEmptyLineItem()],
      invoiceDiscountType: "None",
      invoiceDiscountValue: "",
      supportingContent: createEmptySupportingContent(),
    });

    expect(payload.reference).toBeNull();
    expect(payload.shipTo).toBeNull();
    expect(payload.notes).toBeNull();
    expect(payload.templateId).toBeNull();
  });

  it("parses the invoice discount value when a discount is set", () => {
    const payload = buildInvoiceSavePayload({
      draft: createEmptyDraft(),
      lineItems: [createEmptyLineItem()],
      invoiceDiscountType: "Percentage",
      invoiceDiscountValue: "10",
      supportingContent: createEmptySupportingContent(),
    });

    expect(payload.invoiceDiscountType).toBe("Percentage");
    expect(payload.invoiceDiscountValue).toBe(10);
  });
});

const samplePayload = () =>
  buildInvoiceSavePayload({
    draft: createEmptyDraft(),
    lineItems: [createEmptyLineItem()],
    invoiceDiscountType: "None" as const,
    invoiceDiscountValue: "",
    supportingContent: createEmptySupportingContent(),
  });

const sampleSavedInvoice = { id: "inv-1", customerId: "cust-1", invoiceNumber: "INV-1", status: "Draft" };

describe("createInvoice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts with credentials included and returns the saved invoice", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleSavedInvoice) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createInvoice(samplePayload());

    expect(result).toEqual(sampleSavedInvoice);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/invoices");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
  });

  it("throws the server's error detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Bill To is required." }) }));

    await expect(createInvoice(samplePayload())).rejects.toThrow("Bill To is required.");
  });
});

describe("updateInvoice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("puts to the invoice's own URL with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleSavedInvoice) });
    vi.stubGlobal("fetch", fetchMock);

    await updateInvoice("inv-1", samplePayload());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/invoices/inv-1");
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("include");
  });

  it("throws a generic message when the error response has no detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("not json")) }));

    await expect(updateInvoice("inv-1", samplePayload())).rejects.toThrow("Failed to save this invoice.");
  });
});
