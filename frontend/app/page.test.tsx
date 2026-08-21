import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Landing page", () => {
  it("routes every primary Create Invoice CTA to the invoice generator", () => {
    render(<Home />);

    const ctas = screen.getAllByRole("link", { name: "Create Free Invoice" });

    // docs/FSD.md section 6.1: the hero and the Free pricing plan both carry the primary CTA.
    expect(ctas).toHaveLength(2);
    ctas.forEach((cta) => {
      expect(cta).toHaveAttribute("href", "/invoice/create");
    });
  });
});
