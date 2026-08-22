import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("exposes every approved destination in the desktop navigation", () => {
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Invoice Generator" })).toHaveAttribute(
      "href",
      "/invoice/create",
    );
    expect(within(nav).getByRole("link", { name: "Templates" })).toHaveAttribute("href", "#templates");
    expect(within(nav).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup");
  });

  it("keeps the mobile menu closed and its links out of the DOM until opened", () => {
    render(<SiteHeader />);

    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile primary" })).not.toBeInTheDocument();
  });

  it("opens the mobile menu with every destination reachable by pointer, via a real click", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const toggle = screen.getByRole("button", { name: "Close menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    expect(within(mobileNav).getByRole("link", { name: "Invoice Generator" })).toHaveAttribute(
      "href",
      "/invoice/create",
    );
    expect(within(mobileNav).getByRole("link", { name: "Templates" })).toHaveAttribute("href", "#templates");
    expect(within(mobileNav).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    expect(within(mobileNav).getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(within(mobileNav).getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup");
  });

  it("is operable by keyboard: Tab reaches the toggle, Enter opens it, Escape closes it", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.tab();
    while (screen.queryByRole("button", { name: "Open menu" }) !== document.activeElement) {
      await user.tab();
    }
    await user.keyboard("{Enter}");

    expect(screen.getByRole("navigation", { name: "Mobile primary" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("navigation", { name: "Mobile primary" })).not.toBeInTheDocument();
  });

  it("closes the mobile menu after a destination is chosen", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    await user.click(within(mobileNav).getByRole("link", { name: "Pricing" }));

    expect(screen.queryByRole("navigation", { name: "Mobile primary" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});
