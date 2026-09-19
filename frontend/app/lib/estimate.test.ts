import { describe, expect, it } from "vitest";
import { buildEstimateSavePayload, createEmptyEditableEstimate, toEditableEstimate, type EstimateDetail } from "./estimate";

describe("createEmptyEditableEstimate", () => {
  it("bootstraps a single empty line item and the given currency/dates", () => {
    const editable = createEmptyEditableEstimate("AUD", "2026-09-01", "2026-09-15");

    expect(editable.currency).toBe("AUD");
    expect(editable.header.issueDate).toBe("2026-09-01");
    // IG-220: "Due Date" (the shared field name) carries the estimate's expiry date.
    expect(editable.header.dueDate).toBe("2026-09-15");
    expect(editable.lineItems).toHaveLength(1);
    expect(editable.discountType).toBe("None");
  });
});

describe("toEditableEstimate / buildEstimateSavePayload", () => {
  const detail: EstimateDetail = {
    id: "est-1",
    customerId: "cust-1",
    estimateNumber: "EST-0001",
    status: "Draft",
    issueDate: "2026-09-01",
    expiryDate: "2026-09-15",
    reference: "PO-1",
    currency: "AUD",
    seller: "My Business",
    customer: "Acme Pty Ltd",
    shipTo: null,
    items: [{ description: "Consulting", quantity: 2, unit: "Hour", unitPrice: 100, taxRate: 10, discount: 0 }],
    discountType: "None",
    discountValue: null,
    notes: "Thanks",
    terms: null,
    paymentInstructions: null,
    templateId: null,
    templateCustomization: null,
    subtotal: 200,
    discountAmount: 0,
    taxAmount: 20,
    totalAmount: 220,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  it("round-trips a saved estimate's detail into the editable shape and back into a save payload", () => {
    const editable = toEditableEstimate(detail);

    expect(editable.header.invoiceNumber).toBe("EST-0001");
    expect(editable.header.dueDate).toBe("2026-09-15");
    expect(editable.lineItems).toHaveLength(1);
    expect(editable.lineItems[0].description).toBe("Consulting");

    const payload = buildEstimateSavePayload(editable);

    expect(payload.estimateNumber).toBe("EST-0001");
    expect(payload.expiryDate).toBe("2026-09-15");
    expect(payload.currency).toBe("AUD");
    expect(payload.items).toEqual([{ description: "Consulting", quantity: 2, unit: "Hour", unitPrice: 100, taxRate: 10, discount: 0 }]);
    expect(payload.customerId).toBeNull();
  });

  it("carries a selected customer id through to the save payload", () => {
    const editable = toEditableEstimate(detail);

    const payload = buildEstimateSavePayload(editable, "picked-customer-id");

    expect(payload.customerId).toBe("picked-customer-id");
  });

  it("falls back to a single empty line item when the saved estimate has none", () => {
    const editable = toEditableEstimate({ ...detail, items: [] });

    expect(editable.lineItems).toHaveLength(1);
    expect(editable.lineItems[0].description).toBe("");
  });
});
