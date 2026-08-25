import { describe, expect, it } from "vitest";
import {
  computeLineTotals,
  createEmptyLineItem,
  hasAnyLineItemError,
  sumLineTotals,
  validateLineItem,
  validateLineItems,
  type LineItem,
} from "./lineItems";

function itemWith(overrides: Partial<LineItem>): LineItem {
  return { ...createEmptyLineItem(), ...overrides };
}

describe("createEmptyLineItem", () => {
  it("defaults quantity to 1, discount to 0 and tax rate to the AU default (10%)", () => {
    const item = createEmptyLineItem();

    expect(item.quantity).toBe("1");
    expect(item.discount).toBe("0");
    expect(item.taxRatePreset).toBe("10");
    expect(item.description).toBe("");
    expect(item.unitPrice).toBe("");
  });

  it("gives every item a distinct id", () => {
    const a = createEmptyLineItem();
    const b = createEmptyLineItem();

    expect(a.id).not.toBe(b.id);
  });
});

describe("computeLineTotals", () => {
  it("computes quantity x unit price as the line amount - FSD section 27", () => {
    const item = itemWith({ quantity: "2", unitPrice: "50", discount: "0", taxRatePreset: "0" });

    expect(computeLineTotals(item).lineAmount).toBe(100);
  });

  it("subtracts the line discount before tax", () => {
    const item = itemWith({ quantity: "2", unitPrice: "50", discount: "10", taxRatePreset: "0" });

    expect(computeLineTotals(item).discountedLineAmount).toBe(90);
  });

  it("applies the selected tax rate on top of the discounted amount", () => {
    const item = itemWith({ quantity: "1", unitPrice: "100", discount: "0", taxRatePreset: "10" });

    const totals = computeLineTotals(item);
    expect(totals.taxAmount).toBe(10);
    expect(totals.lineTotal).toBe(110);
  });

  it("uses the custom tax rate when the preset is 'custom'", () => {
    const item = itemWith({
      quantity: "1",
      unitPrice: "100",
      discount: "0",
      taxRatePreset: "custom",
      customTaxRate: "7.5",
    });

    expect(computeLineTotals(item).taxAmount).toBe(7.5);
  });

  it("never returns a negative discounted amount even if inputs are malformed", () => {
    const item = itemWith({ quantity: "1", unitPrice: "10", discount: "999", taxRatePreset: "0" });

    expect(computeLineTotals(item).discountedLineAmount).toBe(0);
  });

  it("treats a non-numeric field as 0 rather than throwing", () => {
    const item = itemWith({ quantity: "not-a-number", unitPrice: "10", taxRatePreset: "0" });

    expect(computeLineTotals(item).lineAmount).toBe(0);
  });
});

describe("sumLineTotals", () => {
  it("sums the line total of every item", () => {
    const items = [
      itemWith({ quantity: "1", unitPrice: "100", discount: "0", taxRatePreset: "0" }),
      itemWith({ quantity: "2", unitPrice: "50", discount: "0", taxRatePreset: "0" }),
    ];

    expect(sumLineTotals(items)).toBe(200);
  });

  it("returns 0 for an empty list", () => {
    expect(sumLineTotals([])).toBe(0);
  });
});

describe("validateLineItem", () => {
  const valid = itemWith({ description: "Consulting", quantity: "2", unitPrice: "100", discount: "0" });

  it("accepts a fully valid item", () => {
    expect(validateLineItem(valid)).toEqual({});
  });

  it("requires a description", () => {
    expect(validateLineItem({ ...valid, description: "" }).description).toBe("Description is required.");
  });

  it("rejects a description over 500 characters - FSD section 18", () => {
    const errors = validateLineItem({ ...valid, description: "a".repeat(501) });
    expect(errors.description).toBe("Description must be 500 characters or fewer.");
  });

  it("requires quantity greater than 0 - FSD section 19", () => {
    expect(validateLineItem({ ...valid, quantity: "0" }).quantity).toBe("Quantity must be greater than 0.");
    expect(validateLineItem({ ...valid, quantity: "-1" }).quantity).toBe("Quantity must be greater than 0.");
    expect(validateLineItem({ ...valid, quantity: "" }).quantity).toBe("Quantity is required.");
  });

  it("accepts a decimal quantity - FSD section 19 example values", () => {
    expect(validateLineItem({ ...valid, quantity: "1.5" }).quantity).toBeUndefined();
  });

  it("requires unit price and rejects a negative value - FSD section 21", () => {
    expect(validateLineItem({ ...valid, unitPrice: "" }).unitPrice).toBe("Unit Price is required.");
    expect(validateLineItem({ ...valid, unitPrice: "-5" }).unitPrice).toBe("Unit Price cannot be negative.");
  });

  it("accepts a zero unit price - FSD section 21 allows >= 0", () => {
    expect(validateLineItem({ ...valid, unitPrice: "0" }).unitPrice).toBeUndefined();
  });

  it("rejects a negative discount", () => {
    expect(validateLineItem({ ...valid, discount: "-1" }).discount).toBe("Discount cannot be negative.");
  });

  it("rejects a discount larger than the line amount", () => {
    const errors = validateLineItem({ ...valid, quantity: "1", unitPrice: "10", discount: "20" });
    expect(errors.discount).toBe("Discount cannot exceed the line amount.");
  });

  it("accepts an empty discount (treated as none)", () => {
    expect(validateLineItem({ ...valid, discount: "" }).discount).toBeUndefined();
  });

  it("requires a custom tax rate only when the preset is 'custom'", () => {
    expect(validateLineItem({ ...valid, taxRatePreset: "10" }).customTaxRate).toBeUndefined();
    expect(validateLineItem({ ...valid, taxRatePreset: "custom", customTaxRate: "" }).customTaxRate).toBe(
      "Enter a custom tax rate.",
    );
  });

  it("rejects a custom tax rate outside 0-100", () => {
    const errors = validateLineItem({ ...valid, taxRatePreset: "custom", customTaxRate: "150" });
    expect(errors.customTaxRate).toBe("Tax rate must be between 0 and 100.");
  });

  it("accepts a valid custom tax rate", () => {
    const errors = validateLineItem({ ...valid, taxRatePreset: "custom", customTaxRate: "7.5" });
    expect(errors.customTaxRate).toBeUndefined();
  });
});

describe("validateLineItems / hasAnyLineItemError", () => {
  it("keys errors by item id", () => {
    const validItem = itemWith({ description: "Consulting", quantity: "1", unitPrice: "10" });
    const invalidItem = itemWith({ description: "", quantity: "1", unitPrice: "10" });

    const errors = validateLineItems([validItem, invalidItem]);

    expect(errors[validItem.id]).toEqual({});
    expect(errors[invalidItem.id].description).toBe("Description is required.");
  });

  it("hasAnyLineItemError is false when every item is valid", () => {
    const items = [itemWith({ description: "Consulting", quantity: "1", unitPrice: "10" })];
    expect(hasAnyLineItemError(validateLineItems(items))).toBe(false);
  });

  it("hasAnyLineItemError is true when any item has an error", () => {
    const items = [itemWith({ description: "", quantity: "1", unitPrice: "10" })];
    expect(hasAnyLineItemError(validateLineItems(items))).toBe(true);
  });
});
