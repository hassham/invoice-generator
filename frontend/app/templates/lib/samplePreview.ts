import { addDaysIso, todayIsoDate, type FieldValues } from "../../invoice/create/lib/invoiceDraft";
import { calculateInvoiceTotals } from "../../invoice/create/lib/invoiceTotals";
import { createEmptyLineItem, toCalculationInput, type LineItem } from "../../invoice/create/lib/lineItems";
import { createEmptySupportingContent, type SupportingContentValues } from "../../invoice/create/lib/supportingContent";
import { getDefaultCustomization, type TemplateCustomization } from "../../invoice/create/lib/templateCustomization";

export interface SamplePreviewProps {
  header: FieldValues;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string;
  lineItems: LineItem[];
  totals: ReturnType<typeof calculateInvoiceTotals>;
  supportingContent: SupportingContentValues;
  templateCustomization: TemplateCustomization;
  logo: string | null;
}

function sampleLineItems(): LineItem[] {
  return [
    { ...createEmptyLineItem(), description: "Website design", quantity: "1", unitPrice: "1200", taxRatePreset: "10" },
    { ...createEmptyLineItem(), description: "Hosting (monthly)", quantity: "3", unitPrice: "45", taxRatePreset: "10" },
  ];
}

/**
 * IG-204: illustrative, hardcoded content for the Templates gallery's "Preview" action - not real
 * invoice data, just enough for InvoicePreview to render something representative (every section
 * populated) instead of the mostly-empty state a genuinely new invoice starts in.
 */
export function buildSamplePreviewProps(templateCode: string): SamplePreviewProps {
  const issueDate = todayIsoDate();
  const lineItems = sampleLineItems();

  return {
    header: {
      invoiceNumber: "INV-000123",
      issueDate,
      dueDate: addDaysIso(issueDate, 14),
      reference: "",
    },
    currency: "USD",
    seller: "Acme Pty Ltd\n1 Example St, Sydney NSW 2000",
    customer: "Jane's Cafe\n22 High St, Melbourne VIC 3000",
    shipTo: "",
    lineItems,
    totals: calculateInvoiceTotals(lineItems.map(toCalculationInput), "None", null, "Exclusive"),
    supportingContent: { ...createEmptySupportingContent(), notes: "Thank you for your business!" },
    templateCustomization: getDefaultCustomization(templateCode),
    logo: null,
  };
}
