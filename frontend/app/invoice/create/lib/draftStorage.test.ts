import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDraftSnapshot, DRAFT_RETENTION_MS, loadDraftSnapshot, saveDraftSnapshot } from "./draftStorage";
import { createEmptyDraft } from "./invoiceDraft";
import { createEmptyLineItem, type LineItem } from "./lineItems";
import { createEmptySupportingContent } from "./supportingContent";
import type { InvoiceEditorSnapshot } from "./unsavedChanges";

// A single shared item, not a fresh createEmptyLineItem() per snapshot() call - see
// unsavedChanges.test.ts's identical comment for why (independently-created "empty" items get
// different auto-incrementing ids, so two "identical" snapshots would never compare equal).
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

const STORAGE_KEY = "invoiceGenerator.anonymousDraft.v1";

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe("loadDraftSnapshot", () => {
  it("returns null when nothing has been saved", () => {
    expect(loadDraftSnapshot()).toBeNull();
  });

  it("round-trips a saved snapshot", () => {
    const saved = snapshot({ draft: { ...createEmptyDraft(), seller: "Acme Pty Ltd" } });
    saveDraftSnapshot(saved);
    expect(loadDraftSnapshot()).toEqual(saved);
  });

  it("returns null and clears storage for an entry past the retention window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    saveDraftSnapshot(snapshot());
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + DRAFT_RETENTION_MS + 1);

    expect(loadDraftSnapshot()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("still restores an entry saved just under the retention window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const saved = snapshot();
    saveDraftSnapshot(saved);
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + DRAFT_RETENTION_MS - 1);

    expect(loadDraftSnapshot()).toEqual(saved);
  });

  it("returns null and clears storage for unparsable JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadDraftSnapshot()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears storage for a structurally invalid entry - localStorage is untrusted input", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), snapshot: { draft: "not an object" } }));
    expect(loadDraftSnapshot()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to the current template's default customisation instead of an out-of-range stored value", () => {
    const saved = snapshot({
      draft: {
        ...createEmptyDraft(),
        templateCustomization: { primaryColor: "not-a-color", accentColor: "#123456", font: "Comic Sans", headerStyle: "Banner" },
      },
    });
    saveDraftSnapshot(saved);

    const restored = loadDraftSnapshot();
    expect(restored?.draft.templateCustomization.primaryColor).not.toBe("not-a-color");
    expect(restored?.draft.templateCustomization.accentColor).toBe("#123456");
  });

  it("substitutes a fresh empty line item when the stored array is empty - an invoice must always have at least one row", () => {
    const saved = snapshot({ lineItems: [] });
    saveDraftSnapshot(saved);

    const restored = loadDraftSnapshot();
    expect(restored?.lineItems).toHaveLength(1);
  });

  it("fills in missing payment-instruction keys rather than dropping the whole draft", () => {
    const emptySupportingContent = createEmptySupportingContent();
    const saved = snapshot({
      supportingContent: { ...emptySupportingContent, paymentInstructions: { bankName: "ANZ" } },
    });
    saveDraftSnapshot(saved);

    const restored = loadDraftSnapshot();
    expect(restored?.supportingContent.paymentInstructions.bankName).toBe("ANZ");
    expect(restored?.supportingContent.paymentInstructions.iban).toBe("");
  });
});

describe("clearDraftSnapshot", () => {
  it("removes a saved draft so a later load finds nothing", () => {
    saveDraftSnapshot(snapshot());
    clearDraftSnapshot();
    expect(loadDraftSnapshot()).toBeNull();
  });
});
