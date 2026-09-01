import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateCustomerForm } from "./CreateCustomerForm";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CreateCustomerForm", () => {
  it("creates the customer and navigates to its detail page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "c1", businessName: "Acme Pty Ltd" }) }),
    );
    const originalLocation = window.location;
    const navigations: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, set href(value: string) { navigations.push(value); } },
    });
    const user = userEvent.setup();

    render(<CreateCustomerForm />);
    await user.type(screen.getByLabelText("Business Name"), "Acme Pty Ltd");
    await user.click(screen.getByRole("button", { name: "Create customer" }));

    expect(navigations).toContain("/customers/c1");

    Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  });

  it("shows the server's error message when creation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Customer name is required." }) }));
    const user = userEvent.setup();

    render(<CreateCustomerForm />);
    await user.type(screen.getByLabelText("Business Name"), "Acme Pty Ltd");
    await user.click(screen.getByRole("button", { name: "Create customer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Customer name is required.");
  });
});
