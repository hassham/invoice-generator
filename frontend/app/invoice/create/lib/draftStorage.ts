import { createEmptyDraft } from "./invoiceDraft";
import type { InvoiceDiscountType } from "./invoiceTotals";
import { createEmptyLineItem, TAX_RATE_PRESETS, type LineItem } from "./lineItems";
import { createEmptySupportingContent } from "./supportingContent";
import { sanitizeTemplateCustomization } from "./templateCustomization";
import type { InvoiceEditorSnapshot } from "./unsavedChanges";

const STORAGE_KEY = "invoiceGenerator.anonymousDraft.v1";

/**
 * FSD section 37: "Do not treat local storage as permanent user storage." No numeric retention
 * period is specified anywhere in docs/FSD.md, docs/EPICS.md, docs/STORIES.md or docs/SAD.md - 24
 * hours is a deliberate, conservative choice: long enough to survive an accidental refresh or a
 * same-day reopen, short enough that a long-abandoned draft doesn't resurface days later and
 * overwrite a blank form the visitor actually wants.
 */
export const DRAFT_RETENTION_MS = 24 * 60 * 60 * 1000;

const DISCOUNT_TYPES: InvoiceDiscountType[] = ["None", "Percentage", "Fixed"];

interface StoredDraftEnvelope {
  savedAt: number;
  snapshot: InvoiceEditorSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isValidLineItem(value: unknown): value is LineItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    typeof value.quantity === "string" &&
    typeof value.unit === "string" &&
    typeof value.unitPrice === "string" &&
    (TAX_RATE_PRESETS as readonly string[]).includes(value.taxRatePreset as string) &&
    typeof value.customTaxRate === "string" &&
    typeof value.discount === "string"
  );
}

/**
 * localStorage is a system boundary: any script on the origin (or an older app version's schema)
 * could have written this value, so it's validated structurally before anything reads from it - an
 * invalid or corrupted entry is treated the same as no draft at all rather than crashing or
 * partially hydrating the editor with garbage.
 */
function isValidEnvelope(value: unknown): value is StoredDraftEnvelope {
  if (!isRecord(value) || typeof value.savedAt !== "number") {
    return false;
  }
  const snapshot = value.snapshot;
  if (!isRecord(snapshot)) {
    return false;
  }
  const draft = snapshot.draft;
  const supportingContent = snapshot.supportingContent;
  return (
    isRecord(draft) &&
    typeof draft.currency === "string" &&
    typeof draft.seller === "string" &&
    typeof draft.customer === "string" &&
    typeof draft.shipTo === "string" &&
    typeof draft.templateId === "string" &&
    isStringRecord(draft.header) &&
    Array.isArray(snapshot.lineItems) &&
    snapshot.lineItems.every(isValidLineItem) &&
    typeof snapshot.invoiceDiscountType === "string" &&
    DISCOUNT_TYPES.includes(snapshot.invoiceDiscountType as InvoiceDiscountType) &&
    typeof snapshot.invoiceDiscountValue === "string" &&
    isRecord(supportingContent) &&
    typeof supportingContent.notes === "string" &&
    typeof supportingContent.terms === "string" &&
    typeof supportingContent.customInstructions === "string" &&
    isStringRecord(supportingContent.paymentInstructions)
  );
}

/**
 * Fills in the two fields isValidEnvelope can't fully pin down (logo is nullable; header/payment-
 * instruction keys could be missing if a field was added since the draft was saved) and re-runs the
 * existing template-customisation sanitizer - the same defence lib/templateCustomization.ts already
 * documents as existing for "a future load-from-storage path."
 */
function sanitizeSnapshot(snapshot: InvoiceEditorSnapshot): InvoiceEditorSnapshot {
  const emptyDraft = createEmptyDraft();
  const emptySupportingContent = createEmptySupportingContent();
  return {
    draft: {
      ...emptyDraft,
      ...snapshot.draft,
      header: { ...emptyDraft.header, ...snapshot.draft.header },
      logo: typeof snapshot.draft.logo === "string" ? snapshot.draft.logo : null,
      templateCustomization: sanitizeTemplateCustomization(snapshot.draft.templateCustomization, ""),
    },
    lineItems: snapshot.lineItems.length > 0 ? snapshot.lineItems : [createEmptyLineItem()],
    invoiceDiscountType: snapshot.invoiceDiscountType,
    invoiceDiscountValue: snapshot.invoiceDiscountValue,
    supportingContent: {
      ...emptySupportingContent,
      ...snapshot.supportingContent,
      paymentInstructions: { ...emptySupportingContent.paymentInstructions, ...snapshot.supportingContent.paymentInstructions },
    },
  };
}

function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Safari private browsing (older versions) and similarly locked-down environments can throw
    // just from touching localStorage, not only from writing to it.
    return null;
  }
}

/** Returns null for "nothing to restore" - no draft saved, saved by an incompatible/corrupt shape, or past the retention window. Clears the entry in the latter two cases so a bad value isn't retried on every future load. */
export function loadDraftSnapshot(): InvoiceEditorSnapshot | null {
  const storage = readStorage();
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
  if (!isValidEnvelope(parsed) || Date.now() - parsed.savedAt > DRAFT_RETENTION_MS) {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
  return sanitizeSnapshot(parsed.snapshot);
}

export function saveDraftSnapshot(snapshot: InvoiceEditorSnapshot): void {
  const storage = readStorage();
  if (!storage) {
    return;
  }
  const envelope: StoredDraftEnvelope = { savedAt: Date.now(), snapshot };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or storage disabled - draft persistence is a convenience, not something worth
    // surfacing an error over; the editor keeps working from in-memory state either way.
  }
}

export function clearDraftSnapshot(): void {
  const storage = readStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // As above - failure to clear is not worth surfacing.
  }
}
