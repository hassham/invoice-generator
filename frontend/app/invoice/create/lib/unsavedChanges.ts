import type { InvoiceDraft } from "./invoiceDraft";
import type { InvoiceDiscountType } from "./invoiceTotals";
import type { LineItem } from "./lineItems";
import type { SupportingContentValues } from "./supportingContent";

export interface InvoiceEditorSnapshot {
  draft: InvoiceDraft;
  lineItems: LineItem[];
  invoiceDiscountType: InvoiceDiscountType;
  invoiceDiscountValue: string;
  supportingContent: SupportingContentValues;
}

/**
 * FSD section 81: whether the editor has anything unsaved to warn about. Deep value comparison
 * (not reference equality) so typing into a field and then undoing it back to the pristine text
 * correctly reports "no unsaved changes" again, rather than staying dirty forever once touched.
 */
export function hasUnsavedChanges(current: InvoiceEditorSnapshot, pristine: InvoiceEditorSnapshot): boolean {
  return JSON.stringify(current) !== JSON.stringify(pristine);
}
