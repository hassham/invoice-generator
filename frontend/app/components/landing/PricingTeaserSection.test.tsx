import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PricingTeaserSection } from "./PricingTeaserSection";

describe("PricingTeaserSection", () => {
  it("opens the invoice generator route from the Free plan's Create Invoice CTA", () => {
    render(<PricingTeaserSection />);

    const cta = screen.getByRole("link", { name: "Create Free Invoice" });

    expect(cta).toHaveAttribute("href", "/invoice/create");
  });

  it("does not send the Pro plan CTA to the invoice generator route", () => {
    render(<PricingTeaserSection />);

    const cta = screen.getByRole("link", { name: "Sign up to get started" });

    expect(cta).toHaveAttribute("href", "/signup");
  });
});
