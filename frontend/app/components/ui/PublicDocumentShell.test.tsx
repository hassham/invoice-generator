import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicDocumentShell } from "./PublicDocumentShell";
import { metadata as invoiceMetadata } from "../../i/[token]/page";
import { metadata as estimateMetadata } from "../../e/[token]/page";

vi.mock("../../i/[token]/components/HostedInvoiceView", () => ({ HostedInvoiceView: () => null }));
vi.mock("../../e/[token]/components/HostedEstimateView", () => ({ HostedEstimateView: () => null }));

describe("public document branding", () => {
  it("shows the Bevorly brand without adding account or workspace navigation", () => {
    render(<PublicDocumentShell><h1>Example merchant</h1></PublicDocumentShell>);
    expect(screen.getByRole("link", { name: "Bevorly home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Example merchant" }));
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("keeps hosted invoice and estimate token URLs out of search", () => {
    expect(invoiceMetadata.robots).toEqual({ index: false, follow: false });
    expect(estimateMetadata.robots).toEqual({ index: false, follow: false });
  });
});
