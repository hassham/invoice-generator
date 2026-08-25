import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "./invoiceDraft";
import { createEmptyLineItem, type LineItem } from "./lineItems";
import { createEmptySupportingContent } from "./supportingContent";
import { hasUnsavedChanges, type InvoiceEditorSnapshot } from "./unsavedChanges";

// A single shared item, not a fresh createEmptyLineItem() per snapshot() call - createEmptyLineItem
// assigns a new incrementing id every time, so two independently-created "empty" items would never
// be considered equal even with identical content, which would make every "unchanged" comparison
// in these tests spuriously report as dirty.
const pristineLineItem: LineItem = createEmptyLineItem();

function snapshot(overrides: Partial<InvoiceEditorSnapshot> = {}): InvoiceEditorSnapshot {
  return {
    draft: createEmptyDraft(),
    lineItems: [pristineLineItem],
    invoiceDiscountType: "None",
    invoiceDiscountValue: "",
    supportingContent: createEmptySupportingContent(),
    ...overrides,
  };
}

describe("hasUnsavedChanges", () => {
  it("is false when current matches pristine exactly", () => {
    const pristine = snapshot();
    expect(hasUnsavedChanges(snapshot(), pristine)).toBe(false);
  });

  it("is true once the seller (From) text differs", () => {
    const pristine = snapshot();
    const current = snapshot({ draft: { ...pristine.draft, seller: "Acme Pty Ltd" } });
    expect(hasUnsavedChanges(current, pristine)).toBe(true);
  });

  it("is true once a line item field differs", () => {
    const pristine = snapshot();
    const current = snapshot({ lineItems: [{ ...pristine.lineItems[0], description: "Consulting" }] });
    expect(hasUnsavedChanges(current, pristine)).toBe(true);
  });

  it("is true once the invoice discount differs", () => {
    const pristine = snapshot();
    const current = snapshot({ invoiceDiscountType: "Percentage", invoiceDiscountValue: "10" });
    expect(hasUnsavedChanges(current, pristine)).toBe(true);
  });

  it("is true once supporting content differs", () => {
    const pristine = snapshot();
    const current = snapshot({ supportingContent: { ...pristine.supportingContent, notes: "Thank you." } });
    expect(hasUnsavedChanges(current, pristine)).toBe(true);
  });

  it("is false again once a changed value is reverted back to match pristine - deep equality, not reference", () => {
    const pristine = snapshot();
    const edited = snapshot({ draft: { ...pristine.draft, seller: "Acme Pty Ltd" } });
    const reverted = snapshot({ draft: { ...pristine.draft, seller: pristine.draft.seller } });
    expect(hasUnsavedChanges(edited, pristine)).toBe(true);
    expect(hasUnsavedChanges(reverted, pristine)).toBe(false);
  });
});
