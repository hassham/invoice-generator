import type { CatalogItem } from "../../../lib/items";
import { TAX_RATE_PRESETS, type LineItem, type TaxRatePreset } from "./lineItems";

/** No explicit threshold in FSD section 25 (unlike section 16's "Search begins after 2 characters"
 * for customers) - kept at 2 anyway for UX consistency with CustomerPicker, not an invented FSD
 * requirement. */
export const MIN_SEARCH_LENGTH = 2;

/** FSD section 25: "Display: Name, Price, Unit" in the search dropdown. */
export function filterCatalogItems(items: CatalogItem[], query: string): CatalogItem[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < MIN_SEARCH_LENGTH) {
    return [];
  }
  return items.filter((item) => item.name.toLowerCase().includes(trimmed));
}

function taxRateToPresetFields(taxRate: number | null): { taxRatePreset: TaxRatePreset; customTaxRate: string } {
  // A catalogue item with no configured tax rate is treated as untaxed (the "0" preset), not
  // "unspecified - fall back to the invoice's generic default" - selecting a specific item is a
  // more specific signal than the line's own starting default.
  const rate = taxRate ?? 0;
  const asPresetString = String(rate);
  const matchesPreset = (TAX_RATE_PRESETS as readonly string[]).includes(asPresetString) && asPresetString !== "custom";
  return matchesPreset
    ? { taxRatePreset: asPresetString as TaxRatePreset, customTaxRate: "" }
    : { taxRatePreset: "custom", customTaxRate: String(rate) };
}

/**
 * FSD section 25: "Selecting an item populates: Description, Unit, Unit Price, Tax Rate." Quantity
 * and Discount are deliberately left untouched - they're properties of this specific invoice line,
 * not the catalogue record.
 *
 * The line's Description is filled from the catalogue item's own Description when it has one,
 * falling back to its Name otherwise - Name is required on every catalogue item (so this can never
 * leave a blank, invalid line description) while Description is optional and, when present, is the
 * more specific customer-facing text.
 *
 * IG-58 AC "adjust the invoice copy without silently changing the catalogue record" holds by
 * construction: LineItem carries no id/reference back to the CatalogItem it was populated from,
 * only a one-time copy of its field values at selection time - the same "invoice stores a
 * snapshot" guarantee FSD section 25 itself requires.
 */
export function applyCatalogItemToLineItem(item: LineItem, catalogItem: CatalogItem): LineItem {
  const description = catalogItem.description?.trim() ? catalogItem.description : catalogItem.name;
  const { taxRatePreset, customTaxRate } = taxRateToPresetFields(catalogItem.taxRate);

  return {
    ...item,
    description,
    unit: catalogItem.unit ?? "",
    unitPrice: String(catalogItem.unitPrice),
    taxRatePreset,
    customTaxRate,
  };
}
