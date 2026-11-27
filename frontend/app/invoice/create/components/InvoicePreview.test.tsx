import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildSamplePreviewProps } from "../../../templates/lib/samplePreview";
import { InvoicePreview } from "./InvoicePreview";

describe("InvoicePreview document layouts", () => {
  it.each(["studio", "ledger", "horizon"])("renders %s without dropping invoice content", (templateCode) => {
    const sample = buildSamplePreviewProps(templateCode);
    const { container, rerender } = render(<InvoicePreview {...sample} />);
    const layout = container.querySelector("[data-document-layout]");
    expect(layout).toHaveAttribute("data-document-layout", templateCode);
    expect(screen.getByText("Invoice")).toBeInTheDocument();
    expect(screen.getByText(sample.header.invoiceNumber)).toBeInTheDocument();
    expect(screen.getByText("Bill to")).toBeInTheDocument();
    expect(screen.getByText("Website design")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();

    rerender(<InvoicePreview {...sample} templateCustomization={{ ...sample.templateCustomization, headerStyle: "Banner" }} />);
    expect(layout).toHaveAttribute("data-document-layout", templateCode);
  });

  it.each(["classic", "modern", "minimal", "unknown"])("preserves the legacy structure for %s", (templateCode) => {
    const { container } = render(<InvoicePreview {...buildSamplePreviewProps(templateCode)} />);
    expect(container.querySelector("[data-document-layout]")).toHaveAttribute("data-document-layout", "legacy");
  });
});
