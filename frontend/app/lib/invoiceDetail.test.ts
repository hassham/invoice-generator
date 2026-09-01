import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInvoiceUpdatePayload, getInvoice, toEditableInvoice, type InvoiceDetail } from "./invoiceDetail";

const sampleDetail: InvoiceDetail = {
  id: "invoice-1",
  customerId: "customer-1",
  invoiceNumber: "INV-000001",
  status: "Draft",
  issueDate: "2026-08-01",
  dueDate: "2026-08-15",
  reference: "PO-9",
  currency: "AUD",
  seller: "Acme Pty Ltd",
  customer: "Jane's Cafe",
  shipTo: "Warehouse 3",
  items: [{ description: "Consulting", quantity: 2, unit: "Hour", unitPrice: 100, taxRate: 10, discount: 0 }],
  invoiceDiscountType: "None",
  invoiceDiscountValue: null,
  notes: "Thanks",
  terms: "Due in 14 days",
  paymentInstructions: "Bank Name: Big Bank\nPay via bank transfer",
  templateId: "template-classic",
  templateCustomization: { primaryColor: "#0f172a", accentColor: "#0f172a", font: "Arial, Helvetica, sans-serif", headerStyle: "Banner" },
  subtotal: 200,
  discountAmount: 0,
  taxAmount: 20,
  totalAmount: 220,
  amountPaid: 0,
  amountDue: 220,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("toEditableInvoice", () => {
  it("maps a loaded invoice's numeric/nullable fields into the editable string form", () => {
    const editable = toEditableInvoice(sampleDetail);

    expect(editable.header).toEqual({ invoiceNumber: "INV-000001", issueDate: "2026-08-01", dueDate: "2026-08-15", reference: "PO-9" });
    expect(editable.seller).toBe("Acme Pty Ltd");
    expect(editable.shipTo).toBe("Warehouse 3");
    expect(editable.paymentInstructions).toBe("Bank Name: Big Bank\nPay via bank transfer");
    expect(editable.lineItems).toHaveLength(1);
    expect(editable.lineItems[0]).toMatchObject({ description: "Consulting", quantity: "2", unit: "Hour", unitPrice: "100", taxRatePreset: "10", discount: "0" });
  });

  it("maps a non-preset tax rate to the custom preset with its value preserved", () => {
    const editable = toEditableInvoice({ ...sampleDetail, items: [{ ...sampleDetail.items[0], taxRate: 7.5 }] });

    expect(editable.lineItems[0]).toMatchObject({ taxRatePreset: "custom", customTaxRate: "7.5" });
  });

  it("falls back to a single blank line item if the loaded invoice somehow has none", () => {
    const editable = toEditableInvoice({ ...sampleDetail, items: [] });

    expect(editable.lineItems).toHaveLength(1);
  });

  it("converts null optional fields to empty strings", () => {
    const editable = toEditableInvoice({ ...sampleDetail, reference: null, shipTo: null, notes: null, terms: null, paymentInstructions: null, templateId: null, templateCustomization: null });

    expect(editable.header.reference).toBe("");
    expect(editable.shipTo).toBe("");
    expect(editable.notes).toBe("");
    expect(editable.terms).toBe("");
    expect(editable.paymentInstructions).toBe("");
    expect(editable.templateId).toBe("");
    expect(editable.templateCustomization).toEqual({ primaryColor: "#0f172a", accentColor: "#0f172a", font: "Arial, Helvetica, sans-serif", headerStyle: "Banner" });
  });
});

describe("buildInvoiceUpdatePayload", () => {
  it("round-trips the free-text Payment Instructions field as customInstructions with paymentInstructions null", () => {
    const editable = toEditableInvoice(sampleDetail);

    const payload = buildInvoiceUpdatePayload(editable);

    expect(payload.customInstructions).toBe("Bank Name: Big Bank\nPay via bank transfer");
    expect(payload.paymentInstructions).toBeNull();
  });

  it("maps header/party/discount fields straight through", () => {
    const editable = toEditableInvoice(sampleDetail);

    const payload = buildInvoiceUpdatePayload(editable);

    expect(payload.invoiceNumber).toBe("INV-000001");
    expect(payload.seller).toBe("Acme Pty Ltd");
    expect(payload.customer).toBe("Jane's Cafe");
    expect(payload.shipTo).toBe("Warehouse 3");
    expect(payload.items).toEqual([{ description: "Consulting", quantity: 2, unit: "Hour", unitPrice: 100, taxRate: 10, discount: 0 }]);
    expect(payload.templateId).toBe("template-classic");
  });

  it("nulls out an empty Payment Instructions field rather than sending an empty string", () => {
    const editable = toEditableInvoice({ ...sampleDetail, paymentInstructions: null });

    const payload = buildInvoiceUpdatePayload(editable);

    expect(payload.customInstructions).toBeNull();
  });
});

describe("getInvoice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends credentials: include and returns the parsed invoice", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleDetail) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getInvoice("invoice-1");

    expect(result).toEqual(sampleDetail);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/invoices/invoice-1");
    expect(init.credentials).toBe("include");
  });

  it("throws the server's error detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Invoice not found." }) }));

    await expect(getInvoice("missing")).rejects.toThrow("Invoice not found.");
  });
});
