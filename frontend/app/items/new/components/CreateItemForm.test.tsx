import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateItemForm } from "./CreateItemForm";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CreateItemForm", () => {
  it("shows the entered item and decimal price in the invoice-line preview", async () => {
    const user = userEvent.setup();
    render(<CreateItemForm />);
    await user.type(screen.getByLabelText("Name"), "Design time");
    await user.type(screen.getByLabelText("Unit"), "hour");
    await user.type(screen.getByLabelText("Unit Price"), "125.50");
    const preview = screen.getByRole("complementary", { name: "Item preview" });
    expect(preview).toHaveTextContent("Design time");
    expect(preview).toHaveTextContent("125.50 / hour");
    expect(screen.getByLabelText("Unit Price")).toHaveAttribute("step", "any");
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/items");
  });

  it("creates the item and navigates to its detail page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "i1", name: "Consulting Hour" }) }),
    );
    const originalLocation = window.location;
    const navigations: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, set href(value: string) { navigations.push(value); } },
    });
    const user = userEvent.setup();

    render(<CreateItemForm />);
    await user.type(screen.getByLabelText("Name"), "Consulting Hour");
    await user.click(screen.getByRole("button", { name: "Create item" }));

    expect(navigations).toContain("/items/i1");

    Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  });

  it("shows the server's error message when creation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Unit price cannot be negative." }) }));
    const user = userEvent.setup();

    render(<CreateItemForm />);
    await user.type(screen.getByLabelText("Name"), "Consulting Hour");
    await user.click(screen.getByRole("button", { name: "Create item" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unit price cannot be negative.");
  });
});
