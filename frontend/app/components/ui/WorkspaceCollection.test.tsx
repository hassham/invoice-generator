import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceCollection, WorkspaceHeading, WorkspaceRowLink } from "./WorkspaceCollection";

describe("Workspace collection", () => {
  it("uses one labelled table for desktop and stacked rows with associated column headers", () => {
    render(<WorkspaceCollection area="invoice" caption="Invoices" title="Invoice register"
      rows={[{ id: "INV-7", amount: "AUD 12,345.67" }]} rowKey={(row) => row.id}
      columns={[
        { key: "amount", label: "Amount", align: "end", render: (row) => row.amount },
        { key: "actions", label: "Actions", wide: true, render: (row) => <WorkspaceRowLink href={"/documents/invoices/" + row.id}>View</WorkspaceRowLink> },
      ]} />);
    const table = within(screen.getByRole("table", { name: "Invoices" }));
    expect(screen.getByRole("region", { name: "Invoice register" })).toBeVisible();
    const header = table.getByRole("columnheader", { name: "Amount" });
    const amount = table.getByRole("cell", { name: "AUD 12,345.67" });
    expect(amount).toHaveAttribute("headers", header.id);
    expect(amount).toHaveAttribute("data-align", "end");
    expect(amount.querySelector('[aria-hidden="true"]')).toHaveTextContent("Amount");
    const link = table.getByRole("link", { name: "View" });
    expect(link).toHaveAttribute("href", "/documents/invoices/INV-7");
    expect(link.closest("td")).toHaveAttribute("data-wide", "true");
  });

  it("keeps the record heading and back link accessible", () => {
    render(<WorkspaceHeading area="customer" eyebrow="Workspace / Customer record" title="Example Studio"
      back={{ label: "Back to customers", href: "/customers" }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Example Studio" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Back to customers/ })).toHaveAttribute("href", "/customers");
  });
});
