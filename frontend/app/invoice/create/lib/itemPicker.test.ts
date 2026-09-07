import { describe, expect, it } from "vitest";
import type { CatalogItem } from "../../../lib/items";
import { applyCatalogItemToLineItem, filterCatalogItems } from "./itemPicker";
import { createEmptyLineItem } from "./lineItems";

function makeCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "i1",
    name: "Consulting Hour",
    description: "One hour of consulting",
    sku: "SKU-1",
    unit: "Hour",
    unitPrice: 150,
    taxRate: 10,
    isArchived: false,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("filterCatalogItems", () => {
  const items = [
    makeCatalogItem({ id: "i1", name: "Consulting Hour" }),
    makeCatalogItem({ id: "i2", name: "Widget" }),
  ];

  it("returns nothing for fewer than 2 characters", () => {
    expect(filterCatalogItems(items, "c")).toEqual([]);
    expect(filterCatalogItems(items, "")).toEqual([]);
  });

  it("matches by name, case-insensitively", () => {
    expect(filterCatalogItems(items, "consult")).toEqual([items[0]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterCatalogItems(items, "zephyr")).toEqual([]);
  });
});

describe("applyCatalogItemToLineItem", () => {
  it("populates description, unit, unit price and tax rate, leaving quantity and discount untouched", () => {
    const line = { ...createEmptyLineItem(), quantity: "3", discount: "5" };

    const result = applyCatalogItemToLineItem(line, makeCatalogItem());

    expect(result.description).toBe("One hour of consulting");
    expect(result.unit).toBe("Hour");
    expect(result.unitPrice).toBe("150");
    expect(result.taxRatePreset).toBe("10");
    expect(result.customTaxRate).toBe("");
    expect(result.quantity).toBe("3");
    expect(result.discount).toBe("5");
  });

  it("falls back to the catalogue item's name when it has no description", () => {
    const result = applyCatalogItemToLineItem(createEmptyLineItem(), makeCatalogItem({ description: null }));

    expect(result.description).toBe("Consulting Hour");
  });

  it("falls back to the catalogue item's name when its description is blank", () => {
    const result = applyCatalogItemToLineItem(createEmptyLineItem(), makeCatalogItem({ description: "   " }));

    expect(result.description).toBe("Consulting Hour");
  });

  it("maps a null tax rate to the 0% preset, not the line's prior value", () => {
    const line = { ...createEmptyLineItem(), taxRatePreset: "custom" as const, customTaxRate: "7" };

    const result = applyCatalogItemToLineItem(line, makeCatalogItem({ taxRate: null }));

    expect(result.taxRatePreset).toBe("0");
    expect(result.customTaxRate).toBe("");
  });

  it("uses the custom preset for a tax rate that doesn't match any fixed preset", () => {
    const result = applyCatalogItemToLineItem(createEmptyLineItem(), makeCatalogItem({ taxRate: 8.5 }));

    expect(result.taxRatePreset).toBe("custom");
    expect(result.customTaxRate).toBe("8.5");
  });

  it("maps a missing unit to an empty string, not null", () => {
    const result = applyCatalogItemToLineItem(createEmptyLineItem(), makeCatalogItem({ unit: null }));

    expect(result.unit).toBe("");
  });
});
