import { describe, expect, it } from "vitest";
import { buildInvoicePdfPayloadFromEditable } from "./invoiceDetailPdf";
import { toEditableInvoice, type InvoiceDetail } from "./invoiceDetail";

const sampleDetail: InvoiceDetail = {
  id: "invoice-1",
  customerId: "customer-1",
  invoiceNumber: "INV-000001",
  status: "Draft",
  issueDate: "2026-08-01",
  dueDate: "2026-08-15",
  reference: null,
  currency: "AUD",
  seller: "Acme Pty Ltd",
  customer: "Jane's Cafe",
  shipTo: null,
  items: [{ description: "Consulting", quantity: 2, unit: null, unitPrice: 100, taxRate: 10, discount: 0 }],
  invoiceDiscountType: "None",
  invoiceDiscountValue: null,
  notes: null,
  terms: null,
  paymentInstructions: null,
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

describe("buildInvoicePdfPayloadFromEditable", () => {
  it("maps a saved invoice's editable state into the backend's PDF request shape", () => {
    const editable = toEditableInvoice(sampleDetail);

    const payload = buildInvoicePdfPayloadFromEditable(editable, "classic");

    expect(payload.invoiceNumber).toBe("INV-000001");
    expect(payload.issueDate).toBe("2026-08-01");
    expect(payload.dueDate).toBe("2026-08-15");
    expect(payload.seller).toBe("Acme Pty Ltd");
    expect(payload.customer).toBe("Jane's Cafe");
    expect(payload.items).toEqual([{ description: "Consulting", quantity: 2, unit: null, unitPrice: 100, taxRate: 10, discount: 0 }]);
    expect(payload.templateCode).toBe("classic");
    expect(payload.templateCustomization).toEqual(sampleDetail.templateCustomization);
  });

  it("nulls out empty optional text fields rather than sending empty strings", () => {
    const editable = toEditableInvoice(sampleDetail);

    const payload = buildInvoicePdfPayloadFromEditable(editable, "");

    expect(payload.reference).toBeNull();
    expect(payload.shipTo).toBeNull();
    expect(payload.notes).toBeNull();
    expect(payload.terms).toBeNull();
    expect(payload.templateCode).toBeNull();
  });

  it("rides the free-text Payment Instructions field in as customInstructions with the structured field left null", () => {
    const editable = toEditableInvoice({ ...sampleDetail, paymentInstructions: "Bank Name: Big Bank\nPay within 14 days" });

    const payload = buildInvoicePdfPayloadFromEditable(editable, "classic");

    expect(payload.customInstructions).toBe("Bank Name: Big Bank\nPay within 14 days");
    expect(payload.paymentInstructions).toBeNull();
  });

  it("parses the invoice discount value when a discount is set", () => {
    const editable = toEditableInvoice({ ...sampleDetail, invoiceDiscountType: "Percentage", invoiceDiscountValue: 10 });

    const payload = buildInvoicePdfPayloadFromEditable(editable, "classic");

    expect(payload.invoiceDiscountType).toBe("Percentage");
    expect(payload.invoiceDiscountValue).toBe(10);
  });
});
