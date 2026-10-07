import { describe, expect, it } from "vitest";
import {
  buildCreatePurchaseOrderRequest,
  computePurchaseOrderDraftTotals,
  createEmptyPurchaseOrderDraft,
  hasAnyPurchaseOrderDraftError,
  newPurchaseOrderLineItem,
  todayIsoDate,
  validatePurchaseOrderDraft,
  type PurchaseOrderDraft,
} from "./purchaseOrderDraft";

function draftWith(changes: Partial<PurchaseOrderDraft> = {}): PurchaseOrderDraft {
  const base = createEmptyPurchaseOrderDraft("AUD", 10, "2030-08-01");
  return {
    ...base,
    supplierId: "sup-1",
    dueDate: "2030-08-15",
    lineItems: [{ ...base.lineItems[0], description: "Steel bolts", quantity: "2", unitPrice: "100" }],
    ...changes,
  };
}

describe("todayIsoDate", () => {
  it("formats a date as yyyy-mm-dd in local time", () => {
    // Deliberately a single-digit month and day, and late enough in the day that a UTC-based
    // implementation would roll a positive-offset timezone onto the following date.
    expect(todayIsoDate(new Date(2030, 7, 5, 23, 30))).toBe("2030-08-05");
  });
});

describe("createEmptyPurchaseOrderDraft", () => {
  it("starts from the business defaults with one empty line", () => {
    const draft = createEmptyPurchaseOrderDraft("NZD", 15, "2030-08-01");

    expect(draft.currency).toBe("NZD");
    expect(draft.issueDate).toBe("2030-08-01");
    expect(draft.supplierId).toBe("");
    expect(draft.lineItems).toHaveLength(1);
    expect(draft.lineItems[0].taxRatePreset).toBe("15");
  });

  // An order's delivery deadline is a commitment, so it is never guessed on the user's behalf.
  it("leaves the required-by date blank rather than defaulting it", () => {
    expect(createEmptyPurchaseOrderDraft("AUD", 10, "2030-08-01").dueDate).toBe("");
  });

  it("carries a non-preset business tax rate through as a custom rate", () => {
    const line = newPurchaseOrderLineItem(7.5);

    expect(line.taxRatePreset).toBe("custom");
    expect(line.customTaxRate).toBe("7.5");
  });
});

describe("validatePurchaseOrderDraft", () => {
  it("accepts a complete draft", () => {
    const errors = validatePurchaseOrderDraft(draftWith());

    expect(hasAnyPurchaseOrderDraftError(errors)).toBe(false);
  });

  it("requires a supplier", () => {
    const errors = validatePurchaseOrderDraft(draftWith({ supplierId: "" }));

    expect(errors.supplierId).toBe("Choose the supplier this order is going to.");
  });

  it("requires both dates", () => {
    const errors = validatePurchaseOrderDraft(draftWith({ issueDate: "", dueDate: "" }));

    expect(errors.issueDate).toBe("Issue date is required.");
    expect(errors.dueDate).toBe("Required by date is required.");
  });

  it("rejects a required-by date earlier than the issue date", () => {
    const errors = validatePurchaseOrderDraft(draftWith({ issueDate: "2030-08-10", dueDate: "2030-08-09" }));

    expect(errors.dueDate).toBe("Required by date cannot be before the issue date.");
  });

  it("allows a required-by date equal to the issue date", () => {
    const errors = validatePurchaseOrderDraft(draftWith({ issueDate: "2030-08-10", dueDate: "2030-08-10" }));

    expect(errors.dueDate).toBeUndefined();
  });

  // Guards against a naive comparison that would read "2030-09-01" as earlier than "2030-10-01".
  it("compares dates chronologically across a month boundary", () => {
    const errors = validatePurchaseOrderDraft(draftWith({ issueDate: "2030-09-30", dueDate: "2030-10-01" }));

    expect(errors.dueDate).toBeUndefined();
  });
});

describe("computePurchaseOrderDraftTotals", () => {
  /** Mirrors PurchaseOrderService: discount comes off the line before tax is applied. */
  it("discounts the line before taxing it", () => {
    const draft = draftWith({
      lineItems: [
        {
          ...createEmptyPurchaseOrderDraft("AUD", 10, "2030-08-01").lineItems[0],
          description: "Steel bolts",
          quantity: "2",
          unitPrice: "100",
          discount: "20",
        },
      ],
    });

    const totals = computePurchaseOrderDraftTotals(draft.lineItems);

    expect(totals.subtotal).toBe(180);
    expect(totals.taxAmount).toBe(18);
    expect(totals.total).toBe(198);
  });

  it("sums every line", () => {
    const base = createEmptyPurchaseOrderDraft("AUD", 0, "2030-08-01").lineItems[0];
    const totals = computePurchaseOrderDraftTotals([
      { ...base, quantity: "1", unitPrice: "50" },
      { ...base, id: "second", quantity: "3", unitPrice: "10" },
    ]);

    expect(totals.subtotal).toBe(80);
    expect(totals.taxAmount).toBe(0);
    expect(totals.total).toBe(80);
  });

  it("treats a still-empty line as zero rather than NaN", () => {
    const totals = computePurchaseOrderDraftTotals(createEmptyPurchaseOrderDraft("AUD", 10, "2030-08-01").lineItems);

    expect(totals.total).toBe(0);
  });
});

describe("buildCreatePurchaseOrderRequest", () => {
  it("parses the typed strings into the numbers the API expects", () => {
    const request = buildCreatePurchaseOrderRequest(draftWith());

    expect(request.supplierId).toBe("sup-1");
    expect(request.issueDate).toBe("2030-08-01");
    expect(request.dueDate).toBe("2030-08-15");
    expect(request.items).toEqual([
      { description: "Steel bolts", quantity: 2, unit: null, unitPrice: 100, taxRate: 10, discount: 0 },
    ]);
  });

  it("sends optional free text as null when it is blank or whitespace", () => {
    const request = buildCreatePurchaseOrderRequest(
      draftWith({ reference: "   ", notes: "", terms: "  \n ", deliveryInstructions: "Rear dock" })
    );

    expect(request.reference).toBeNull();
    expect(request.notes).toBeNull();
    expect(request.terms).toBeNull();
    expect(request.deliveryInstructions).toBe("Rear dock");
  });

  it("resolves a custom tax rate to its numeric value", () => {
    const base = draftWith();
    const request = buildCreatePurchaseOrderRequest({
      ...base,
      lineItems: [{ ...base.lineItems[0], taxRatePreset: "custom", customTaxRate: "7.5" }],
    });

    expect(request.items[0].taxRate).toBe(7.5);
  });

  it("omits any figure the backend derives for itself", () => {
    const request = buildCreatePurchaseOrderRequest(draftWith());

    // Numbering and all totals are the backend's job (AGENTS.md: the backend is authoritative).
    expect(request).not.toHaveProperty("poNumber");
    expect(request).not.toHaveProperty("totalAmount");
    expect(request.items[0]).not.toHaveProperty("lineTotal");
  });
});
