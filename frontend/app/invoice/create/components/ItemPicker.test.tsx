import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CatalogItem } from "../../../lib/items";
import { ItemPicker } from "./ItemPicker";

const items: CatalogItem[] = [
  {
    id: "i1",
    name: "Consulting Hour",
    description: "One hour of consulting",
    sku: "SKU-1",
    unit: "Hour",
    unitPrice: 150,
    taxRate: 10,
    isArchived: false,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "i2",
    name: "Widget",
    description: null,
    sku: null,
    unit: null,
    unitPrice: 20,
    taxRate: null,
    isArchived: false,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
];

describe("ItemPicker", () => {
  it("shows no dropdown before 2 characters are typed", async () => {
    const user = userEvent.setup();
    render(<ItemPicker id="item-picker" items={items} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Search saved items"), "C");

    expect(screen.queryByRole("button", { name: /Consulting/ })).not.toBeInTheDocument();
  });

  it("shows matching items with their price and unit", async () => {
    const user = userEvent.setup();
    render(<ItemPicker id="item-picker" items={items} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Search saved items"), "Consult");

    const match = await screen.findByRole("button", { name: /Consulting Hour/ });
    expect(match).toHaveTextContent("150.00");
    expect(match).toHaveTextContent("Hour");
    expect(screen.queryByRole("button", { name: /Widget/ })).not.toBeInTheDocument();
  });

  it("shows a no-matches message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<ItemPicker id="item-picker" items={items} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Search saved items"), "Zephyr");

    expect(await screen.findByText("No matching items.")).toBeInTheDocument();
  });

  it("calls onSelect with the chosen item and resets the search box", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ItemPicker id="item-picker" items={items} onSelect={onSelect} />);

    await user.type(screen.getByLabelText("Search saved items"), "Consult");
    await user.click(await screen.findByRole("button", { name: /Consulting Hour/ }));

    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(screen.getByLabelText("Search saved items")).toHaveValue("");
  });

  it("stays open and selectable via keyboard after Tabbing from the search box into it (IG-69)", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ItemPicker id="item-picker" items={items} onSelect={onSelect} />);

    await user.type(screen.getByLabelText("Search saved items"), "Consult");
    const match = await screen.findByRole("button", { name: /Consulting Hour/ });

    await user.keyboard("{Tab}");
    expect(match).toHaveFocus();
    // The dropdown must not unmount once focus has moved onto one of its own buttons - a plain
    // input-level onBlur used to close it out from under a keyboard user shortly after Tab.
    expect(match).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });
});
