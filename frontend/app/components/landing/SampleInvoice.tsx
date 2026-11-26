import { InvoicePreview } from "../../invoice/create/components/InvoicePreview";
import { calculateInvoiceTotals } from "../../invoice/create/lib/invoiceTotals";
import type { LineItem } from "../../invoice/create/lib/lineItems";
import { createEmptySupportingContent } from "../../invoice/create/lib/supportingContent";
import { getDefaultCustomization } from "../../invoice/create/lib/templateCustomization";

const items: LineItem[] = [
  { id: "design", description: "Brand design", quantity: "1", unit: "Project", unitPrice: "1500", taxRatePreset: "0", customTaxRate: "", discount: "0" },
  { id: "consult", description: "Consultation", quantity: "2", unit: "Hour", unitPrice: "350", taxRatePreset: "0", customTaxRate: "", discount: "0" },
  { id: "revisions", description: "Revisions", quantity: "1", unit: "Service", unitPrice: "250", taxRatePreset: "0", customTaxRate: "", discount: "0" },
];

const totals = calculateInvoiceTotals(items.map((item) => ({
  quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discount: 0, taxRate: 0,
})), "None", null, "Exclusive");

export function SampleInvoice({ variant = "classic" }: { variant?: "classic" | "modern" | "minimal" }) {
  return (
    <div className="min-w-0 bg-paper">
      <InvoicePreview
        header={{ invoiceNumber: "INV-1042", issueDate: "2026-11-25", dueDate: "2026-12-25", reference: "" }}
        currency="AUD"
        seller="Studio North"
        customer="Bloom Company"
        shipTo=""
        lineItems={items}
        totals={totals}
        supportingContent={createEmptySupportingContent()}
        templateCustomization={getDefaultCustomization(variant)}
        logo={null}
      />
    </div>
  );
}
