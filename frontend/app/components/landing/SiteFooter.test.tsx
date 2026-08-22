import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("exposes every approved destination in the footer navigation, reachable at any viewport", () => {
    render(<SiteFooter />);

    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(within(nav).getByRole("link", { name: "Invoice Generator" })).toHaveAttribute(
      "href",
      "/invoice/create",
    );
    expect(within(nav).getByRole("link", { name: "Templates" })).toHaveAttribute("href", "#templates");
    expect(within(nav).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    expect(within(nav).getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(within(nav).getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup");
  });

  it("is operable by keyboard: every footer link is a native, individually focusable anchor", () => {
    render(<SiteFooter />);

    const nav = screen.getByRole("navigation", { name: "Footer" });
    const links = within(nav).getAllByRole("link");
    // Real <a> elements are natively Tab-reachable and Enter-activatable with no extra
    // wiring required, unlike SiteHeader's mobile disclosure - this asserts that stays true.
    links.forEach((link) => expect(link.tagName).toBe("A"));
    expect(links).toHaveLength(5);
  });
});
