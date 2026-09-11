import { describe, expect, it } from "vitest";
import { todayIsoDate } from "../../invoice/create/lib/invoiceDraft";
import { buildSamplePreviewProps } from "./samplePreview";

describe("buildSamplePreviewProps", () => {
  it("builds a fully-populated sample invoice so every InvoicePreview section has content", () => {
    const props = buildSamplePreviewProps("classic");

    expect(props.header.invoiceNumber).not.toBe("");
    expect(props.header.issueDate).toBe(todayIsoDate());
    expect(props.seller.length).toBeGreaterThan(0);
    expect(props.customer.length).toBeGreaterThan(0);
    expect(props.lineItems.length).toBeGreaterThan(0);
    expect(props.totals.totalAmount).toBeGreaterThan(0);
    expect(props.supportingContent.notes.length).toBeGreaterThan(0);
  });

  it("applies the requested template's own default customization", () => {
    const classic = buildSamplePreviewProps("classic");
    const modern = buildSamplePreviewProps("modern");

    expect(classic.templateCustomization).not.toEqual(modern.templateCustomization);
  });
});
