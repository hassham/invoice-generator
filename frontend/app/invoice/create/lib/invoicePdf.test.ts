import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "./invoiceDraft";
import { buildInvoicePdfPayload, downloadInvoicePdf } from "./invoicePdf";
import { createEmptyLineItem } from "./lineItems";
import { createEmptySupportingContent } from "./supportingContent";

describe("buildInvoicePdfPayload", () => {
  it("maps the editor's state into the backend's request shape", () => {
    const draft = { ...createEmptyDraft(), seller: "Acme", customer: "Jane's Cafe", header: { ...createEmptyDraft().header, invoiceNumber: "INV-1", issueDate: "2026-08-19", dueDate: "2026-09-02" } };
    const lineItems = [{ ...createEmptyLineItem(), description: "Consulting", quantity: "2", unitPrice: "50" }];

    const payload = buildInvoicePdfPayload({
      draft,
      lineItems,
      invoiceDiscountType: "None",
      invoiceDiscountValue: "",
      supportingContent: createEmptySupportingContent(),
      templateCode: "classic",
    });

    expect(payload.invoiceNumber).toBe("INV-1");
    expect(payload.seller).toBe("Acme");
    expect(payload.customer).toBe("Jane's Cafe");
    expect(payload.items).toEqual([{ description: "Consulting", quantity: 2, unit: null, unitPrice: 50, taxRate: 10, discount: 0 }]);
    expect(payload.invoiceDiscountValue).toBeNull();
    expect(payload.templateCode).toBe("classic");
  });

  it("nulls out empty optional text fields rather than sending empty strings", () => {
    const draft = createEmptyDraft();
    const payload = buildInvoicePdfPayload({
      draft,
      lineItems: [createEmptyLineItem()],
      invoiceDiscountType: "None",
      invoiceDiscountValue: "",
      supportingContent: createEmptySupportingContent(),
      templateCode: "",
    });

    expect(payload.reference).toBeNull();
    expect(payload.shipTo).toBeNull();
    expect(payload.notes).toBeNull();
    expect(payload.terms).toBeNull();
    expect(payload.templateCode).toBeNull();
  });

  it("parses the invoice discount value when a discount is set", () => {
    const payload = buildInvoicePdfPayload({
      draft: createEmptyDraft(),
      lineItems: [createEmptyLineItem()],
      invoiceDiscountType: "Percentage",
      invoiceDiscountValue: "10",
      supportingContent: createEmptySupportingContent(),
      templateCode: "classic",
    });

    expect(payload.invoiceDiscountType).toBe("Percentage");
    expect(payload.invoiceDiscountValue).toBe(10);
  });
});

describe("downloadInvoicePdf", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("triggers a download when the response is ok", async () => {
    const blob = new Blob(["pdf-bytes"], { type: "application/pdf" });
    const response = {
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: { get: () => 'attachment; filename="Invoice-INV-1.pdf"' },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === "a") {
        element.click = clickSpy;
      }
      return element;
    });

    await downloadInvoicePdf(buildValidPayload());

    expect(clickSpy).toHaveBeenCalled();
  });

  it("throws the server's error detail when the response is not ok", async () => {
    const response = { ok: false, json: () => Promise.resolve({ detail: "Invoice number is required." }) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(downloadInvoicePdf(buildValidPayload())).rejects.toThrow("Invoice number is required.");
  });

  it("falls back to a generic message when the error response has no detail", async () => {
    const response = { ok: false, json: () => Promise.reject(new Error("not json")) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(downloadInvoicePdf(buildValidPayload())).rejects.toThrow("Failed to generate the PDF.");
  });
});

function buildValidPayload() {
  return buildInvoicePdfPayload({
    draft: createEmptyDraft(),
    lineItems: [createEmptyLineItem()],
    invoiceDiscountType: "None" as const,
    invoiceDiscountValue: "",
    supportingContent: createEmptySupportingContent(),
    templateCode: "classic",
  });
}
