import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("opens the invoice generator from the primary CTA and explains the download sign-in gate", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: "Create Free Invoice" })).toHaveAttribute("href", "/invoice/create");
    expect(screen.getByText("No account to create or preview. Sign in to download or print.")).toBeVisible();
  });

  it("shows a labelled sample rendered with invoice line items and calculated totals", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Less paperwork. More business.");
    expect(screen.getByRole("link", { name: "See a sample invoice" })).toHaveAttribute("href", "#sample-invoice");
    const invoice = screen.getByRole("figure", { name: "Sample invoice" });
    expect(within(invoice).getByRole("table")).toHaveTextContent("Brand design");
    expect(within(invoice).getByText("AUD 2450.00", { selector: "dd.font-semibold" })).toBeVisible();
    expect(within(invoice).getByText("Paid")).toBeVisible();
  });
});
