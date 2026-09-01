import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./SiteHeader";

function stubSession(account: { userId: string; email: string; name: string | null } | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      account
        ? { ok: true, json: () => Promise.resolve(account) }
        : { ok: false, json: () => Promise.resolve(null) },
    ),
  );
}

describe("SiteHeader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exposes every approved destination in the desktop navigation", async () => {
    stubSession(null);
    render(<SiteHeader />);
    await screen.findByRole("link", { name: "Login" });

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

  it("keeps the mobile menu closed and its links out of the DOM until opened", async () => {
    stubSession(null);
    render(<SiteHeader />);
    await screen.findByRole("link", { name: "Login" });

    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile primary" })).not.toBeInTheDocument();
  });

  it("opens the mobile menu with every destination reachable by pointer, via a real click", async () => {
    stubSession(null);
    const user = userEvent.setup();
    render(<SiteHeader />);
    await screen.findByRole("link", { name: "Login" });

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

  it("is operable by keyboard: Tab reaches the toggle, Enter opens it, Escape closes it and returns focus to the toggle", async () => {
    stubSession(null);
    const user = userEvent.setup();
    render(<SiteHeader />);
    await screen.findByRole("link", { name: "Login" });

    await user.tab();
    while (screen.queryByRole("button", { name: "Open menu" }) !== document.activeElement) {
      await user.tab();
    }
    await user.keyboard("{Enter}");

    expect(screen.getByRole("navigation", { name: "Mobile primary" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("navigation", { name: "Mobile primary" })).not.toBeInTheDocument();
    // WAI-ARIA disclosure pattern: cancelling via Escape must not strand keyboard focus -
    // it returns to the control that opened the panel.
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("closes the mobile menu after a destination is chosen", async () => {
    stubSession(null);
    const user = userEvent.setup();
    render(<SiteHeader />);
    await screen.findByRole("link", { name: "Login" });

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    await user.click(within(mobileNav).getByRole("link", { name: "Pricing" }));

    expect(screen.queryByRole("navigation", { name: "Mobile primary" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("shows the account name and a logout control instead of Login/Sign Up once a session is found", async () => {
    stubSession({ userId: "u1", email: "jane@example.com", name: "Jane" });
    render(<SiteHeader />);

    expect(await screen.findByText("Jane")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign Up" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("hides the Dashboard, Customers and Invoices links when signed out", async () => {
    stubSession(null);
    render(<SiteHeader />);
    await screen.findByRole("link", { name: "Login" });

    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Customers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Invoices" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("shows a Customers link, in both navs, once a session is found (IG-55)", async () => {
    stubSession({ userId: "u1", email: "jane@example.com", name: "Jane" });
    render(<SiteHeader />);
    await screen.findByRole("button", { name: "Log out" });

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Customers" })).toHaveAttribute("href", "/customers");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    expect(within(mobileNav).getByRole("link", { name: "Customers" })).toHaveAttribute("href", "/customers");
  });

  it("shows an Invoices link, in both navs, once a session is found (IG-62)", async () => {
    stubSession({ userId: "u1", email: "jane@example.com", name: "Jane" });
    render(<SiteHeader />);
    await screen.findByRole("button", { name: "Log out" });

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Invoices" })).toHaveAttribute("href", "/documents/invoices");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    expect(within(mobileNav).getByRole("link", { name: "Invoices" })).toHaveAttribute("href", "/documents/invoices");
  });

  it("shows a Dashboard link, in both navs, once a session is found (IG-60/IG-61)", async () => {
    stubSession({ userId: "u1", email: "jane@example.com", name: "Jane" });
    render(<SiteHeader />);
    await screen.findByRole("button", { name: "Log out" });

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    expect(within(mobileNav).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("shows a Settings link, in both navs, once a session is found (IG-53)", async () => {
    stubSession({ userId: "u1", email: "jane@example.com", name: "Jane" });
    render(<SiteHeader />);
    await screen.findByRole("button", { name: "Log out" });

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings/business");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    expect(within(mobileNav).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings/business");
  });

  it("falls back to the email when the account has no name", async () => {
    stubSession({ userId: "u1", email: "jane@example.com", name: null });
    render(<SiteHeader />);

    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
  });

  it("calls the logout endpoint and reverts to Login/Sign Up when Log out is clicked", async () => {
    stubSession({ userId: "u1", email: "jane@example.com", name: "Jane" });
    const user = userEvent.setup();
    render(<SiteHeader />);
    await screen.findByRole("button", { name: "Log out" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(null) }));
    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Sign Up" })).toBeInTheDocument();
  });
});
