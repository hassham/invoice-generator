import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

// SiteHeader checks the session on mount (IG-26) - stubbed so this suite doesn't depend on a
// running backend.
vi.mock("./lib/auth", () => ({
  getCurrentSession: vi.fn(() => Promise.resolve(null)),
}));

// GuestOnlyContent reads the router, which only exists inside the Next.js app router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("Landing page", () => {
  it("routes every primary Create Invoice CTA to the invoice generator", async () => {
    render(<Home />);

    // The content waits for the session check to settle, so wait for it to appear.
    const ctas = await screen.findAllByRole("link", { name: "Create Free Invoice" });

    // docs/FSD.md section 6.1: the hero and the Free pricing plan both carry the primary CTA.
    expect(ctas).toHaveLength(2);
    ctas.forEach((cta) => {
      expect(cta).toHaveAttribute("href", "/invoice/create");
    });
  });
});
